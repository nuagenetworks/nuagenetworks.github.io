---
layout: post
title: Scripting with Nuage VSPK - Part 1 - Introduction & basic examples
author: Philippe Dellaert
tags: VSPK, open source, Python
callout_image: nuage-community-header.jpg
excerpt: Nuage Networks has released their VSPK, an SDK with several language bindings. In this blog post we will start with an introduction and go through the basics of using the VSPK with several examples.

---

# Introduction
Today i want to talk about a Nuage VSP feature which allows you to create your own tools to interact with your Nuage VSP environment: The Nuage VSPK. The Nuage VSPK uses the Nuage VSD REST API to do all its actions, so if you are familiar with the REST API, you will quickly grasp the use of the Nuage VSPK.

The Nuage VSPK is available in two flavors: a Python flavor and a Go flavor. This last one was [released last week](http://nuagenetworks.github.io/2016/02/20/Go-Bambo-Go.html), for now, we will cover the usage of the VSPK using the Python flavor.

I will cover this aspect in multiple parts. This post will cover the installation of the VSPK and its structure, before leading up to the write-up of three scripts that:

  * Show the structure of a particular domain
  * Get an overview of all used Floating IPs
  * Gather the events/logs for a particular enterprise

At the end there will also be some pointers on where to find a full API reference and where to find more examples.

In the next posts you can expect some more complex examples that show you how to listen to VSD events or how to combine the VSPK with VMware vCenter API to implement a dynamic policy group mapping.

This post is a copy of a blog post of mine on the Nuage Community.

Happy reading !

# Installation

To install the Nuage VSPK, the easiest way is to use pip. Pip allows a user to quickly install a Python package with all its requirements. For the Nuage VSPK, the command is simple:

{% highlight bash %}
$ pip install vspk
{% endhighlight %}

If you feel a bit more adventurous and would like to use the latest development release, you can also build your own VSPK from scratch using the [Github repositories](https://github.com/nuagenetworks). I will not go into to much details on this, but below is a Shell script that does it all for you:
{% highlight bash %}
#!/bin/bash
CURDIR=`pwd`

pip uninstall vspk vspkgenerator monolithe bambou
TMPDIR=`mktemp -d`
cd $TMPDIR
pip install -U git+https://github.com/nuagenetworks/bambou.git
pip install -U git+https://github.com/nuagenetworks/monolithe.git
pip install -U git+https://github.com/nuagenetworks/vspkgenerator.git
generate-vspk -g https://api.github.com -o nuagenetworks -r vsd-api-specifications -b 3.2
cd codegen/python && python setup.py sdist && cd -
pip install -U codegen/python/dist/vspk-*.tar.gz
cd $CURDIR
rm -rf $TMPDIR
{% endhighlight %}

Apart from some minor improvements, there is one major difference between the current pip release and the latest development release: the way to import the Nuage VSPK package has been simplified. In the next section I will show you this difference. All scripts mentioned in this post will also have a mechanism to import the Nuage VSPK in both situations automatically.

In the future, the pip release will of course be updated and also support the simplified import.

# Getting started

## General tip: Try using iPython

If you want to follow the examples below, try using [iPython](http://ipython.org/). iPython is an interactive Python shell environment with tab completion and loads of other features. This allows you to investigate objects quickly and get a good feel for the structure of the Nuage VSPK and the differnet types of objects it contains.

### Importing the Nuage VSPK package

The first thing you need to do to start working with the Python Nuage VSPK is import it into your script. As mentioned before there is a slight difference in how this is achieved depending on the version you are using.

{% highlight python %}
try:
    # Try and import Nuage VSPK from the development release
    from vspk import v3_2 as vsdk
except ImportError:
    # If this fails, import the Nuage VSPK from the pip release
    from vspk.vsdk import v3_2 as vsdk
{% endhighlight %}

## Connecting to the Nuage VSD API

Now that you have the Nuage VSPK package loaded, you need to connect to your Nuage VSP environment. This is done by setting up a connection to the Nuage VSD API. In the example below, i will connect to a VSD with IP 172.16.1.20 and with the csproot credentials.

{% highlight python %}
# Configuring a connection to the VSD API
nc = vsdk.NUVSDSession(username='csproot', password='csproot', enterprise='csp', api_url="https://172.16.1.20:8443")

# Actively connecting ot the VSD API
nc.start()
{% endhighlight %}

In the background, the Nuage VSPK will contact the VSD API and request an API key for the user. It will store this API key in its connection object and use it whenever it needs to talk to the API.

Of course, you can also use a different user, possibly one that is only part of one enterprise/organisation. This will limit the Nuage VSPK and as a result the script to only have access to certain objects and actions. For instance, if you initiate the connection with a user that only has access to one enterprise, it will not be able to create other enterprises, or create, read, update or delete objects inside different enterprises from its own.

# The structure

The Nuage VSPK has a tree-like structure in which there is a root object which has a set of possible children types. A list of each of those types can be gathered by using the appropriate fetcher. Each child object follows the same concept: It has a set of possible children types which can be gathered by the appropriate fetcher

## The root object: user

The root object of this tree is the user object. This object represents the user that is used to log in to the Nuage VSD API and which is used to execute whatever action you want to achieve.

The user object is part over the connection object:

{% highlight python %}
nuage_user = nc.user
{% endhighlight %}


## Types of supported children objects

To find out what types of children a certain object supports, you can use the children\_rest\_names property of a class or an object:

{% highlight python %}
print vsdk.NUSubnet().children_rest_names
# Output:
# ['statistics', 'qos', 'eventlog', 'addressrange', 'dhcpoption', 'vm', 'virtualip', 'ipreservation', 'vminterface', 'resync', 'tca', 'vport', 'statisticspolicy', 'metadata']
{% endhighlight %}

In the above example I'm showing the possible children of a Subnet, some of these types can also be children of other classes or objects. For instance the statistics class can be a child of many different classes or objects.

## Fetching children of a certain type

An object will have fetchers to fetch the children of a certain type. These fetchers will have the plural name of the REST name you see in the children\_rest\_names output. To fetch all the enterprises that the current user has access to, can be done as follows:

{% highlight python %}
enterprises = nuage_user.enterprises.get()
{% endhighlight %}

This will produce a list of Enterprise objects. If you want to print out the name of all Enterprises for instance, you could use the following code:

{% highlight python %}
for ent in enterprises:
    print ent.name
# Sample output:
# Finance Department
# HR Department
{% endhighlight %}

It is also possible to apply a simple filter to the `get()` method, this filter will then limit the returned list of enterprises to those matching the filter:

{% highlight python %}
enterprises = nuage_user.enterprises.get(filter='name == "HR Department"')
for ent in enterprises:
    print ent.name
# Output:
# HR Department

# Simplified if only one object is needed/expected:
enterprise = nuage_user.enterprises.get_first(filter='name == "HR Department"')
print enterprise.name
# Output
# HR Department
{% endhighlight %}

The above example also introduces the `get_first()`  method which allows you to fetch only the first entry. The filter is optional, but advised.

# CRUD operations

## Creating an object

Creating an object is done using the `create_child()`  method on a parent object that supports the object you want to create as a child. By using the `create_child()` method, the object you are creating also gets its properties like the unique ID updated so it can immediately be used.

{% highlight python %}
enterprise = vsdk.NUEnterprise(name='VSPK Enterprise')
print enterprise.id
# Output:
# None
nuage_user.create_child(enterprise)
print enterprise.id
# Output:
# 1f5547c7-3ed5-4aec-a135-a17fcdb35438
{% endhighlight %}

The above example will create a new Enterprise in the Nuage VSD with the name 'VSPK Enterprise'. To find out what properties are available for a certain class/object, you can check the Nuage VSPK reference documentation. If you forget to set a mandatory property, the Nuage VSPK will throw an exception. The following example is taken from iPython:

{% highlight bash %}
In [57]: enterprise = vsdk.NUEnterprise()

In [58]: nuage_user.create_child(enterprise)
---------------------------------------------------------------------------
BambouHTTPError                           Traceback (most recent call last)
<ipython-input-58-650559be2779> in <module>()

<snip>...<snip>

BambouHTTPError: [HTTP 409(Conflict)] [{u'property': u'name', u'descriptions': [{u'description': u'This value is mandatory.', u'title': u'Invalid input'}]}]
{% endhighlight %}

### Choosing the parent object

It is mandatory to use the appropriate parent object, to find out what the appropriate parent object is to create a child object in, look at an existing object of the child object type:

{% highlight python %}
domains = nuage_user.domains.get()
print domain[0].parent_type
# Output:
# enterprise
{% endhighlight %}

As you can see in the above example, even thou i request all domains from the root (which will return all L3 domains from all the Enterprises the user has access to), the domain object will return 'enterprise' as its parent_type. This tells you to use the `create_child()`  method on an enterprise object.

If you create an object on the wrong parent, you will get a '409 - Method not allowed' error.

## Reading an object

Once you have created an object, you might come in a situation where the object gets changed through some other means (for instance, through the GUI by a user). The object inside your tool will contain the old information and won't be updated live when changes are made through other means.

Returning to our Enterprise we created in the previous section, I have changed the name of it to 'VSPK Enterprise - Changed' through the GUI. In my script, the name is still presented as the old one. To get the latest information from the Nuage VSD API, the `fetch()`  method can be used.

{% highlight python %}
print enterprise.name
# Output
# VSPK-Enterprise

enterprise.fetch()

print enterprise.name
# Output
# VSPK-Enterprise - Changed
{% endhighlight %}

## Updating an object

After fetching the latest information of an object, you can make changes to the properties. Again, these changes are only happening locally to the object and are not yet synchronized to the Nuage VSD database. To push these changes to the Nuage VSD database, you need to use the `save()`  method.

{% highlight python %}
print enterprise.name
# Output:
# VSPK Enterprise - Changed

enterprise.name = 'VSPK Enterprise'
# The GUI still shows 'VSPK Enterprise - Changed' as no changes are pushed

enterprise.save()
# The GUI will now also update the name to 'VSPK Enterprise' as it reacquires the information from the database
{% endhighlight %}

## Deleting an object

To delete an object, you use the `delete()`  method on that object. This will immediately remove that object from the Nuage VSD database, unless it has children you need to remove first. For instance: you can not remove a subnet when there are still vPorts present on that subnet.

{% highlight python %}
enterprise.delete()
# The Enterprise is removed from the Nuage VSD
{% endhighlight %}

The object inside your Python environment will still exists. A fetch on the object will fail as it does not exist in the Nuage VSD database anymore.

# Bringing it all together

To bring everything together in some basic examples to show how easy it is to gather information from the Nuage environment. In a later post, we will also start creating objects.

## Printing out a basic structure of a domain

{% highlight python %}
import sys

try:
    # Try and import Nuage VSPK from the development release
    from vspk import v3_2 as vsdk
except ImportError:
    # If this fails, import the Nuage VSPK from the pip release
    from vspk.vsdk import v3_2 as vsdk

# Configuring a connection to the VSD API
nc = vsdk.NUVSDSession(username='csproot', password='csproot', enterprise='csp', api_url="https://172.16.1.20:8443")

# Actively connecting ot the VSD API
nc.start()

domain = nc.user.domains.get_first(filter='name == "VSPK Main domain"')
if not domain:
    print('Error: Domain can not be found')
    sys.exit(-1)

print('Domain: %s' % domain.name)
for cur_zone in domain.zones.get():
    print('|-Zone: %s' % cur_zone.name)
    for cur_subnet in cur_zone.subnets.get():
        print('  |-Subnet: %s - %s - %s' % (cur_subnet.name,cur_subnet.address,cur_subnet.netmask))

print('Policies')
for cur_acl in domain.ingress_acl_templates.get():
    print('|-Ingress ACL: %s' % cur_acl.name)
    for cur_rule in cur_acl.ingress_acl_entry_templates.get():
        print('  |-Rule: %s' % cur_rule.description)

for cur_acl in domain.egress_acl_templates.get():
    print('|-Egress ACL: %s' % cur_acl.name)
    for cur_rule in cur_acl.egress_acl_entry_templates.get():
        print('  |-Rule: %s' % cur_rule.description)
{% endhighlight %}

Let's go over this script step by step:

  1. Import the required packages: sys & the Nuage VSPK
  2. Setting up a connection to the Nuage VSD API
  3. Find the domain called 'VSPK Main domain'
  4. Get all the zones of the domain, and for each:
      1. Print the name
      2. Get all the subnets of the zone and for each print the information
  5. Get all the Ingress ACL policies, and for each:
      1. Print the name
      2. Get all the Rules of the policy and for each print the information
  6. Get all the Egress ACL policies, and for each:
      1. Print the name
      2. Get all the Rules of the policy and for each print the information

The output would look like this:

{% highlight bash %}
Domain: VSPK Main domain
|-Zone: DB-Tier
  |-Subnet: DB-Net - 172.16.2.0 - 255.255.255.0
|-Zone: Web-Tier
  |-Subnet: Web-Net - 172.16.1.0 - 255.255.255.0
Policies
|-Ingress ACL: Blocker
  |-Rule: Block ICMP
|-Ingress ACL: Bottom-AllowAll
|-Egress ACL: Blocker
  |-Rule: Block HTTPS
  |-Rule: Block HTTP
|-Egress ACL: Bottom-AllowAll
{% endhighlight %}

## Gathering an overview of all used Floating IPs

Another script we can have a look at, is the [fip_overview.py](https://github.com/nuagenetworks/vspk-examples/blob/master/fip_overview.py) script which can be found on the Nuage Networks VSPK Examples Github repository. This script will provide the user with an overview of all the Floating IPs that are in use in the enterprises the user has access to.

The script contains a lot of code for argument  logging, and argument and output handling, which i will skip over. You can follow along with the mentioned lines in the code located at [https://github.com/nuagenetworks/vspk-examples/blob/master/fip_overview.py](https://github.com/nuagenetworks/vspk-examples/blob/master/fip_overview.py)

  * Lines 32-35: Importing the Nuage VSPK package
  * Lines 100-109: Establish the connection to the Nuage VSD API
  * Lines 119-137: Collect all floating ips for all the enterprises the user has access to and for each:
      * Line 121: Get the associated vPort
      * Line 122: Get the associated VM interface from the vPort
      * Line 123: Get the VM associated with the VM interface.
      * Lines 125-137: Handle the information into the correct output

The basic result should look more or less like:

{% highlight bash %}
+-----------------+------------------+------------+--------------+-------------------+---------------+
|    Enterprise   |      Domain      |  VM Name   |    VM IP     |       VM MAC      |      FIP      |
+-----------------+------------------+------------+--------------+-------------------+---------------+
| VSPK Enterprise | VSPK Main domain | PROD-WEB01 | 10.10.10.100 | 00:50:56:ac:bf:3a | 138.203.39.60 |
| VSPK Enterprise | VSPK Main domain | PROD-DB01  | 20.20.20.100 | 00:50:56:ac:c1:0d | 138.203.39.95 |
+-----------------+------------------+------------+--------------+-------------------+---------------+
{% endhighlight %}

## Gathering the events/log from an enterprise

The Nuage VSP solution will log every event that happens on an enterprise, this includes all creations, updates and deletions of objects. In this section I will discuss a script which will gather these events and provide a nice output.

The script can also be found on the [Nuage Networks VSPK Examples Github repository](https://github.com/nuagenetworks/vspk-examples/) and is called [events_overview.py](https://github.com/nuagenetworks/vspk-examples/blob/master/events_overview.py). You can follow my explanation by looking at the code located at [https://github.com/nuagenetworks/vspk-examples/blob/master/events_overview.py](https://github.com/nuagenetworks/vspk-examples/blob/master/events_overview.py).

Again, I will only go into detail on the important bits from the Nuage VSPK standpoint, as the other sections are less relevant and just focus on argument and output handling.

  * Lines 44-47: Importing the Nuage VSPK package
  * Lines 105-121: Determining the time difference to use
  * Lines 136-145: Establish the connection to the Nuage VSD API
  * Line 157: Set the time after which the events should have happened to be gathered (using the time difference)
  * Lines 160-181: For each enterprise:
      * Lines 162-181: Gather all events that are later than the time determined in line 157 and at the information of each event to the output

The basic result should look more or less like:

{% highlight bash %}
# python events_overview.py -E csp -H 172.16.1.20 -p csproot -u csproot -S
+-----------------+---------------+---------------------+--------+-------------------------+--------------------+
|    Enterprise   |   Timestamp   |      Date/Time      |  Type  |          Entity         |   Entity parent    |
+-----------------+---------------+---------------------+--------+-------------------------+--------------------+
| VSPK Enterprise | 1456483090000 | 2016-02-26 11:38:10 | CREATE |           job           |       domain       |
| VSPK Enterprise | 1456483091000 | 2016-02-26 11:38:11 | UPDATE |          domain         |     enterprise     |
| VSPK Enterprise | 1456483091000 | 2016-02-26 11:38:11 | UPDATE |           job           |       domain       |
| VSPK Enterprise | 1456483104000 | 2016-02-26 11:38:24 | CREATE |    egressacltemplate    |       domain       |
| VSPK Enterprise | 1456483129000 | 2016-02-26 11:38:49 | CREATE |  egressaclentrytemplate | egressacltemplate  |
| VSPK Enterprise | 1456483141000 | 2016-02-26 11:39:01 | CREATE |  egressaclentrytemplate | egressacltemplate  |
| VSPK Enterprise | 1456483156000 | 2016-02-26 11:39:16 | CREATE |    ingressacltemplate   |       domain       |
| VSPK Enterprise | 1456483172000 | 2016-02-26 11:39:32 | CREATE | ingressaclentrytemplate | ingressacltemplate |
| VSPK Enterprise | 1456483175000 | 2016-02-26 11:39:35 | CREATE |           job           |       domain       |
| VSPK Enterprise | 1456483175000 | 2016-02-26 11:39:35 | UPDATE |          domain         |     enterprise     |
| VSPK Enterprise | 1456483175000 | 2016-02-26 11:39:35 | UPDATE |           job           |       domain       |
+-----------------+---------------+---------------------+--------+-------------------------+--------------------+
{% endhighlight %}

# API Reference

An extensive overview of the API and all its objects and fetchers can be found in the [Nuage VSPK 3.2 API Reference](http://nuagenetworks.github.io/vspkdoc/vsdk_3.2_reference.html).

If you want some more details on what properties are mandatory for a certain object, you can check the REST API documentation, which can be found on each Nuage VSD using the following format: `https://<VSD-IP>:8443/web/docs/api/V3_2/API.html`

Be aware that the Nuage VSPK uses the Python best practices, which means that the camel-case property names of the REST API are replaced by lowercase, underscore-separated property names. For instance, the `templateID` property of a domain in the REST API is equivalent with the `template_id`  property in the Nuage VSPK domain class/object.

# Nuage VSPK Examples Github repository

Now that you have seen the basics of the usage of the Nuage VSPK, you can start and create your own scripts. Nuage Networks has a [public repository](https://github.com/nuagenetworks/vspk-examples) full of examples. Feel free to create your own and you can create a pull request on Github to get your cool examples in there!

Next time we will go through a couple of the more complex scripts that are present in that public repository and how you can interact with other systems like the VMware vCenter API to combine information from both systems and create powerful scripts!

**Update:** Thanks to [Antoine Mercadal](https://twitter.com/primalmotion) to provide a faster and improved script to install the Nuage VSPK from the Github repositories.
