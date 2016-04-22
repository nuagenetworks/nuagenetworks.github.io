---
layout: post
title: Stateful firewalling in Nuage R4.0
author: Jonas Vermeulen
callout_image: nuage-community-header.jpg
tags: ACL Firewall TCP stateful reflexive session tracking conntrack 
excerpt: Nuage R4.0 has been releaed with a major focus on strengthening and extending the security capabilities of the platform. One of those is stateful TCP firewalling. In this blog, the feature will be described what exactly the feature entails, how it was implemented and what the impact is when you upgrade from R3.2 to R4.0.

---

# Introduction 
Within this blog, we will focus on the statefull firewalling capability that was introduced in R4.0 for TCP and ICMP traffic types. Stateful firewalling means that the platform will follow the different stages of a TCP/ICMP session setup and teardown. It basically provides a higher level of protection against L3/L4 attacks and prevents assymetric routing of traffic (ie. return traffic has to follow the same path). 

The parts I will detail out are:

- Configuration aspects
- Querying the session state 
- Upgrade implications


# Configuration aspects

Configuring an Ingress/Egress policy for stateful inspection is very straightforward: it is sufficient to turn on the "stateful" flag as part of entering the rule.

![Configuring a rule for stateful inspection][VSDScreenshot1]


When using the `VSPK`, or `VSD CLI`, you have to make sure the `stateful` flag is set to `true` within the ACL Entry object: 

{% highlight python %}
    from vspk import v4_0 as vsdk
 
    # Creating or fetching Ingress ACL Template on a domain or domain template
    ...
 
    ingress_acl_entry_properties = {
        "network_type": "ANY",
        "network_id": None,
        "location_type": "ANY",
        "location_id": None,
        "stateful": True,
        "source_port": "*",
        "protocol": "6",
        "ether_type": "0x0800",
        "dscp": "*",
        "destination_port": "80",
        "description": "Allow HTTP traffic between all",
        "action": "FORWARD"
    }
    ingress_acl_entry = vsdk.NUIngressACLEntryTemplate(**ingress_acl_entry_properties)
    ingress_acl.create_child(ingress_acl_entry)
{% endhighlight %}

Please note that if you like rule enforcement at both source and destination, make  sure to configure an ingress as well as an egress rule.

# Querying session state

Handling the stateful inspection of a TCP session is fully handled by the VRS - with hooks into the OpenvSwitch flow tables to track the status of each session. To demonstrate this, we will analyze the traffic between two virtual machines with IP `172.16.0.72` (client) and IP `10.10.10.11` (server).

To  query the state of a particular session, the `ovs-appctl` command has been extended with an additional action `bridge/dump-conntracks`. It allows the operator to list out the state of each session. When cycling through the different stages of a successful TCP session setup and tear down, the output of running this command is shown below: 

![Screenshot of CLI output of ovs-appctl bridge/dump-conntracks alubr0][CLIScreenshot1]


# Upgrade Implications

_Stateful_ ACL inspection is the natural successor of using _reflexive_ rules. As such, when you perform an upgrade from 3.2 to 4.0, any reflexive ACL rules will automatically be promoted to stateful.

If you use the `VSPK` or the API, you stil have the possibility of using the `v3_2` version inside your scripts while working with a 4.0 environment. When you create a `IngressACLEntryTemplate` or `EgressACLEntryTemplate`, the `reflexive` property of `v3_2` will be translated to the `stateful` property in the VSD. 

If you decide to upgrade your scripts to `v4_0`, please pay attention to your scripts: the `reflexive` property will not be accepted anymore and you have to specify a value for the `stateful` property instead.



# Conclusion
So I hope you have enjoyed reading up how Nuage VSP now brings stateful TCP flow inspection.
Please let us know if you like us to cover any other R4.0 feature in a future post !

Jonas



[VSDScreenshot1]: {{ site.baseurl}}/img/posts/statefulfirewall/VSDScreenshot1.png
[CLIScreenshot1]:  {{ site.baseurl}}/img/posts/statefulfirewall/CLIScreenshot1.png







 


