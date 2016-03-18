---
layout: post
title: Routing-to-Underlay for FIP and SNAT 
author: Jonas Vermeulen
callout_image: nuage-community-header.jpg
tags: OpenStack, FIP, SNAT, 
---

After a couple of weeks focusing on integration aspects, let us go back to a pure networking feature: Routing-to-Underlay for FIP and SNAT.

From its inception, Nuage Networks VSP provided external connectivity by having gateways terminate the VXLAN tunnel, which in turn can expose the services to the external world. Reachability of external networks was typically programmed through static routes or would be advertised through MP-BGP.  
Since VSP 3.2, we started to add more flexibility on how to provide external access to virtual machines without gateways. Given Nuage Networks is distributing all of its network capabilities as much as possible, it started to make sense to distribute the function of "routing to external networks".

A first application is in OpenStack environments: quite often virtual machines do not use plain routing to reach external networks, but administrators use mechanisms known as Floating IP and SNAT:

- Floating IP is a 1:1 NAT mechanism. It is the default way of working in AWS VPCs and meant for server-based / public-facing workloads. The virtual machine is still installed with a private IP and uses its private IP for internal connectivity. However for any connection from/to an external network, the public IP will be used. 
- SNAT on the other hand is a N:1 mechanism meant for virtual machines that only    need to initiate outgoing connections, eg to retrieve a yum update.
   For those connections, a shared public IP will be used.

When using Nuage VSP, these NAT mechanisms are implemented on the VRS, and you can configure the system so that the VRS sends out the packet directly to the underlay network without VXLAN encapsulation.
To try the features out for yourself, these are the necessary configuration steps:

*   Infrastructure part (= one-off)
    1. Configure VRS with uplink interface to underlay
    2. (Optionally) Configure VRS with separate namespace for enhanced security
    3. Prepare underlay fabric
    4. Configure the Nuage Neutron plugin
* Service part
    - For SNAT, configure "Underlay Support" and "Address Translation Support" at the Nuage domain or Subnet  level
    - For FIP-to-Underlay, configure the FIP-subnet with "Uses Underlay"

# Infrastructure Part

## Configure VRS with uplink interface to underlay

The underlay interface of the hypervisor on which you intend to PAT the traffic out should be configured in the `/etc/default/openvswitch` file in the `NETWORK_UPLINK_INTF` variable .

In a Linux/KVM environment, this can be done by directly editing the `/etc/default/openvswitch`. For example, to select `eth1.100`:

    # NETWORK_UPLINK_INTF: uplink interface of the host
    NETWORK_UPLINK_INTF=eth1.100

If a namespace is used (see below), then the additional namespace variable `NETWORK_NAMESPACE` should be defined as well, and in this case the namespace name will be "fip":

    # NETWORK_NAMESPACE: namespace to create pat interfaces, iptables & route rules
    NETWORK_NAMESPACE=fip

In a ESXi environment, this can be done directly within the vCenter Integration Node.

<figure><center><img src="{{site.baseurl}}/img/posts/routing-to-underlay-for-FIP-SNAT/ESXi-Uplink-Interface.PNG" alt="Configuration of ESXi Uplink Interface"></center></figure>


##(Optionally) Configure VRS with separate namespace for enhanced security
For enhanced security, you may want to configure a separate namespace in your hypervisor.

In a Linux/KVM environment, this is to be done manually before starting up openvswitch process. The following script shows an example on how to do this:

    modprobe 8021q
    vconfig add eth1 100
    ip netns add fip
    ip link set eth1.100 netns fip
    ip netns exec fip bash
    ifconfig eth1.100 up
    ip addr add 10.0.0.2/24 dev eth1.100
    route add default gw 10.0.0.1

As part of a production deployment, this should be included in the startup scripts of your hypervisor setup.

In a ESXi environment, this can be done directly out within the vCenter Integration Node by configuring an address and gateway. During the VRS-VM startup, it will pick up these values and auto-create the namespace.

## Prepare underlay fabric
With routing-to-underlay configured, the fabric will have to be able to route packets to external networks. This is a typical routing aspect that can be solved using dynamic routing protocols or using a default route out.

The fabric also has to route back the packets to the hypervisor. Let’s consider the two types of NAT again on what the implications are:

The SNAT mechanism will source the traffic that is configured on the uplink interface. You can either re-use an existing interface on the hypervisor, in which case nothing has to be changed on the fabric side. Alternatively, you could allocate a new subnet per rack and advertise this subnet to the rest of the fabric.

The FloatingIP mechanism links a public IP 1:1 with a virtual machine. Since this virtual machine is placed by the orchestration system, either

- The orchestration system has to limit the placement of the virtual machine, so that the FIP-subnet is confined to a specific rack and the TOR can announce this subnet to the rest of the network. In OpenStack, this can be achieved using host aggregates; or
- The fabric has to support a flat L2 design across its hypervisors. For people that run a L3 fabric, please be a little patiet, we are working on a solution to dynamically advertise the location of the Floating IP.
 
## Configure the Nuage Neutron plugin
Within the Nuage Neutron plugin configuration file (`nuage_plugin.ini`)  you could configure default behavior for Floating IP Subnets and for enabling SNAT on a per-router basis:

    nuage_fip_underlay = true
    nuage_pat = default_enabled

The final functionality can also be set explicitly on a per FIP-Subnet level, or per-router level respectively.
 
# Service Part
Once the infrastructure is setup, configuring the FIP/SNAT-to-underlay is rather straightforward.
 
## FIP-to-Underlay
 
When configuring FloatingIP Subnets directly in Nuage VSD, one has to select "Uses Underlay":

<figure><center><img src="{{site.baseurl}}/img/posts/routing-to-underlay-for-FIP-SNAT/FIP-Config-Uses-Underlay.PNG" alt="Configuration of FIP Subnet for using Underlay"></center></figure>

When configuring FIP-Subnet pools out of OpenStack, the default behavior is specified in the `nuage_plugin.ini` file. Should you wish to override it, you can use the optional flag `--underlay=True` when creating the external subnet:

    neutron net-create external --router:external
    neutron subnet-create external 50.50.50.0/28 --name FIP-Subnet1 --underlay=True

After having setup the FloatingIP subnet for Underlay, the normal workflow can be used to claim and associate a FloatingIP to a VM.
 
## SNAT-to-Underlay
SNAT has to be enabled on the domain level, and can be overridden on a per-subnet level
Below is an example at subnet level:

<figure><center><img src="{{site.baseurl}}/img/posts/routing-to-underlay-for-FIP-SNAT/SNAT-Config.PNG" alt="Configuration of SNAT for using Underlay"></center></figure> 
 
In OpenStack, SNAT has to be enabled at the router level (subnet-granularity is not supported by OpenStack). Again, the default behavior is specified in the `nuage_plugin.ini` file. Should you wish to override it, you need to add the flag `enable_snat=True` to the `external_gateway_info` attribute of a router:

    neutron router-create router1 --external_gateway_info type=dict network_id=45168855-64ff-4e44-933e-17672fd64516,enable_snat=True 

The UUID mentioned in here is the UUID of an External Network, e.g. the one created before. 
The normal workflow can still be used to launch VMs. Whenever there is outgoing traffic, SNAT-to-underlay will be applied.
 
# Some further operational hints / caveats
Once you start exploring the use of FIP/SNAT-to-underlay in your environment, you may want to be aware of following operational aspects:

- Separation in fabric

Since the underlay network fabric now needs to route packets that have external source/destination IPs, a proper use of network ACLs or separate VRFs may be desirable to separate public-facing traffic from other underlay traffic. Otherwise customer virtual machines might even obtain access to hypervisor IP or other management IP addresses.

- Coexistence of FIP/SNAT

FIP and SNAT can be simultaneously activated on a domain with the following behavior:
 - Every VM or VPort that has a FIP address assigned will prefer the FIP action as opposed to the SNAT action.
 - Other VMs or VPorts in the domain can continue to use the SNAT rules to access external resources to the datacenter

This means that the underlying infrastructure must have been properly provisioned to provide access to external resources for both FIP/SNAT subnets. Otherwise the VM/VPorts will fail to request those external resources.

- Coexistence with default route  

Today’s implementation is fully inline with the routing behaviour in OpenStack. This means that FIP/SNAT action is only taken when there is no matching prefix found in the routing table for the domain. In case you have provisioned a default route in the domain, it will take priority and FIP/SNAT action will never be taken.

Again, we are adding support so you can use both: you are then able to add a specific route to a domain on when to perform "routing-to-underlay". This allows administrators to develop very interesting use cases to access specific shared resources, for example: directly access package repositories or object storage without having to go via a gateway.

# What's next ?
By now you have seen how to setup routing-to-underlay for FIP/SNAT mechanisms. Most of the work is one-off as part of setting up your infrastructure. After that, it becomes quite easy to selectively enable it for the domains/subnets you like. When you are not sure about the final use cases for your cloud, you may want to prepare the infrastructure anyway, you never know when it becomes required !

In any case, seeing the rapid adoption of distributed FIP/SNAT, Nuage actually extended the kind of traffic you can "route-to-underlay": we now also support direct routing-to-underlay of any traffic that leaves the domain without Address-Translation. How this exactly works will be for a next post though…

Have a nice work week ahead!

 


