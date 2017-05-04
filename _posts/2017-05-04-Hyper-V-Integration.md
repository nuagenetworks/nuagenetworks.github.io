---
layout: post
title: Hyper-V Integration for OpenStack
author: Jonas Vermeulen, Harmeet Sahni & Philippe Dellaert
callout_image: nuage-community-header.jpg
tags: Hyper-V, Integration, OpenStack, CloudBase, Openvswitch, OVS, VRS, VSC
excerpt: Recently, Nuage Networks has leveraged their work and extended its Software-Defined Networking (SDN) platform to include Hyper-V support. As such, VXLAN overlay networks can be stretched across KVM, VMware, Hyper-V hypervisors and hardware VTEPs – all provisioned out of the same network policy system. 

---
{:center-img: style="text-align: center;"}

# Introduction
Recently, Nuage Networks has extended its Software-Defined Networking (SDN) platform to include Hyper-V support. As such, VXLAN overlay networks can be stretched across KVM, VMware, Hyper-V hypervisors and hardware VTEPs – all provisioned out of the same network policy system. 

In this post, we are going to look how the Nuage Networks SDN for Hyper-V integration looks like, and we will demonstrate how to network across a heterogeneous environment of Hyper-V, KVM, VMware and Bare Metal end-points.

# Nuage Networks architecture
Before going into the specifics of the integration, let us first start with a simplified view of the Nuage Networks Virtualized Cloud Services (VCS):

![Nuage Networks components overview][nuage-overview]
{: center-img}

This architecture is very typical for a Software Defined Networking platform and is divided into 3 main components:

| **Virtualized Services Directory (VSD)**  | The VSD is a programmable policy and analytics engine. It provides a flexible framework that enables IT administrators to define network topologies and security policies without having to know the underlying network topology.<br><br>It exposes a ReSTful API that can be used to integrate with any CMS or Configuration Management tool.                                                                                                                   |
| **Virtualized Services Controller (VSC)** | The VSC runs a virtualized version of the Nokia Service Router operating system (SR OS), and acts as the SDN controller of the solution. It maintains the forwarding table for every tenant router (logical), and programs the forwarding plane elements (VRS).<br><br>It leverages MP-BGP (or BGP or OVSDB) to scale out and to interop with other datacenter fabric elements.                                                                                  |
| **Virtual Routing and Switching (VRS)**   | Is an enhanced Open vSwitch (OVS) implementation that resides on the hypervisor and is offered in several variants depending on deployment scenarios (ESXi, KVM, Xen, Hyper-V, Docker).<br><br>It participates in the forwarding-plane of the SDN environment. It handles all L2-L4 operations according to the network policy defined by the VSD. Furthermore, it handles ARP requests locally, implements its own DHCP server, relays OpenStack metadata, etc. |

# OpenvSwitch on Microsoft Hyper-V 2012R2
To support the data plane forwarding on Hyper-V hypervisors, Nuage Networks leverages OpenvSwitch for Microsoft Hyper-V. 

OVS for Hyper-V uses the extensible Hyper-V Virtual Switch which allows you to extend the platform with features like forwarding, filtering and monitoring on the virtual machines network processing. The Open vSwitch extension is implemented as a filter driver for the Hyper-V virtual switch and naturally runs in Kernel-mode in the parent partition. 

As such an extension, you can review it in the Virtual Switch Extensions of Windows UI or in PowerShell:

![Hyper-V extensible switch GUI][hyper-v-switch-gui]
{: center-img }

![Hyper-V extensible switch CLI][hyper-v-switch-cli]
{: center-img }

The user space portion of the OVS solution was ported from the Linux OVS implementation and comes with a very similar set of tools and daemons. 

The ovsdb-server and ovs-vswitchd run as a set of Windows services, while a set of ovs-i\*ctl tools is available to configure, query and interact with those services or with the OVS kernel data path directly.

![Hyper-V OVS schematic overview][hyper-v-ovs-overview]
{: center-img}

In the case of a Nuage Networks installation:

* The OVS user-space component was further extended with functionality such as local ARP/DHCP responder, support for redundant SDN controllers, multicast handlers, etc. 
* An additional Nuage Service is installed for monitoring VM lifecycle events (start, stop, migrate, etc). When such event occurs, the network policy for the VM is downloaded from the Nuage Networks VSC. This includes aspects such as IP address information, L2/L3 forwarding instructions, ACL security etc. It will then program the OVS forwarding tables with appropriate rules.

These extensions are similar to what was done for a Nuage Networks in Linux environment.

# Integration with OpenStack
To expose the resources of a hypervisor within an OpenStack environment, following services need to run:

* Compute - Nova Agent
* Network - OVS L2/L3 Agent

## Nova Agent
To include a particular hypervisor into Nova’s scheduling and placement logic, it is required to run a local Nova Agent process. This can signal to the OpenStack controller how many resources are still available, and it takes care of the actual spawning of the virtual machines.

Cloudbase Solutions has packaged the installation of the OpenStack Agents in an easy-to-install MSI package. Cloudbase Solutions is the leading contributor of everything Windows related in OpenStack and it has worked very actively over the last years to develop the required Nova, Neutron, Ceilometer and Open vSwitch (OVS) components in order to add a Hyper-V host as a hypervisor in an OpenStack environment.

For this particular integration, we need to install the Nova part, and optionally the iSCSI Initiator Service.

![Cloudbase Solutions Nova installer][cloudbase-nova]
{: center-img}

## Network Agent(s)
As part of Nuage Networks VCS architecture, there is no need to run a local neutron process/service. Any networking attachment to the OVS Bridge is done directly by the OpenStack Nova Agent, while the OVS ruleset is programmed through VSC.

This implies there is no integration with OpenStack’s RabbitMQ bus for networking. There is also no use of separate bridges or namespaces for standard OpenStack’s Distributed Virtual Routing (DVR)  or Floating-IP. All such info is directly programmed into the logic of a single OVS Bridge.

# Example Deployment

## Sample Architecture
As an example, we will show the deployment of a particular VM in a mixed hypervisor environment.

In this example, we selected a mixture between KVM, VMware and Hyper-V, and we also added a native VLAN port.

![Example deployment overview][example-deployment]
{: center-img}

Each Hypervisor type is managed as a separate Aggregation Group and associated Availability Zone so that placement can easily be controlled.

The Hypervisor view on Horizon shows the hypervisors like this:

![Hypervisor aggregation groups][aggregation-groups]
{: center-img}

Two logical subnets are deployed in OpenStack to boot VMs against, with a variety of virtual instances in each subnet. 

## Deployment of VM
Similar to any deployment of a VM, Horizon or nova boot can be used:

```
root@node-1:~# nova boot --flavor m1.tiny --image Centos-LiveCD --availability-zone hyperv --nic net-id=88760883-f91f-4dff-8965-c4a9de2b4c3e Web-HyperV-3
```

In OpenStack we can see that it got scheduled on the Hyper-V node, and also in Hyper-V Manager, we can find an additional VM showing up.

![Hyper-V VM list][hyper-v-vms]
{: center-img}

## Network Attachment
We can check a few items to verify proper network attachment and connectivity to the other hypervisor types.

### VSD Architect
A full view on all the end points in a particular subnet can be found in the VSD Architect, the Nuage UI component. It will always show you the full network topology (including physical servers), and you can browse associated policies.

![VSD Architect subnet view][vsd-ui-view]
{: center-img}

We can verify that the VM has been added in the appropriate subnet. It immediately gives the user the confirmation that all policies are also downloaded and enforced.

### Inside VM you can verify that it has received an IP

![VM ip command output][vm-ip]
{: center-img}

Note that this IP got provided through DHCP running as part of the Nuage VRS userspace on Hyper-V. You can also verify reachability to other hosts within or across subnets. As an example, this is a PING to another Hyper-V VM (this is a nested hypervisor environment, explaining higher latency):

![VM ping command output][vm-ping]
{: center-img}

### Hypervisor
As previously explained, the actual network connectivity of the VM is established through OVS. The Nova Agent will tie the virtual machine to the OVS Bridge, after which any traffic will be processed by the OVS ruleset that got programmed.

Through the OVS toolset we can examine proper configuration and enforcement. Nuage Networks has slightly extended the ovs-appctl command to facilitate some of this:

![ovs-appctl vm/port-show output][ovs-appctl]
{: center-img}

The port-UUID can then be found back in the ovs-vsctl command output: 

![ovs-vsctl output][ovs-vsctl]
{: center-img}

The alubr0 bridge mentioned in the above screenshot is created by OVS as part of the Nuage Networks VRS functionality. As such, it has been proven VMs were launched out of OpenStack on top of Hyper-V, with the network being established through OVS.

# Conclusion
At Nuage Networks we aim to deploy logical networks across any type of hypervisor, enabling connectivity and security. The OVS work for Hyper-V by Cloudbase Solutions has tremendously helped the community and companies to enable new possibilities for their infrastructure.

Nuage Networks, together with Cloudbase Solutions, is enabling Hyper-V as a first-class citizen in OpenStack so that organizations can leverage OpenStack as a single orchestration platform while choosing the best hypervisor for their various workloads. By using Nuage Networks VCS, customers also get a very versatile and flexible networking layer so that they can software-define the creation of security policies and the extension into the public cloud or branch office networks. 

[nuage-overview]: {{ site.baseurl}}/img/posts/hyper-v-integration/nuage-overview.png
[hyper-v-switch-gui]: {{ site.baseurl}}/img/posts/hyper-v-integration/hyper-v-switch-gui.png
[hyper-v-switch-cli]: {{ site.baseurl}}/img/posts/hyper-v-integration/hyper-v-switch-cli.png
[hyper-v-ovs-overview]: {{ site.baseurl}}/img/posts/hyper-v-integration/hyper-v-ovs-overview.png
[cloudbase-nova]: {{ site.baseurl}}/img/posts/hyper-v-integration/cloudbase-nova.png
[example-deployment]: {{ site.baseurl}}/img/posts/hyper-v-integration/example-deployment.png
[aggregation-groups]: {{ site.baseurl}}/img/posts/hyper-v-integration/aggregation-groups.png
[hyper-v-vms]: {{ site.baseurl}}/img/posts/hyper-v-integration/hyper-v-vms.png
[vsd-ui-view]: {{ site.baseurl}}/img/posts/hyper-v-integration/vsd-ui-view.png
[vm-ip]: {{ site.baseurl}}/img/posts/hyper-v-integration/vm-ip.png
[vm-ping]: {{ site.baseurl}}/img/posts/hyper-v-integration/vm-ping.png
[ovs-appctl]: {{ site.baseurl}}/img/posts/hyper-v-integration/ovs-appctl.png
[ovs-vsctl]: {{ site.baseurl}}/img/posts/hyper-v-integration/ovs-vsctl.png

