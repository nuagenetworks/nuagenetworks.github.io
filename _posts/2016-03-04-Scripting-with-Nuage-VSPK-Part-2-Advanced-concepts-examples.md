---
layout: post
title: Scripting with Nuage VSPK – Part 2 – Advanced concepts & examples
author: Philippe Dellaert
tags: VSPK, open source, Python
callout_image: nuage-community-header.jpg
excerpt: In this second part of our delve into the Nuage VSPK we will go deeper into more advanced concept of using the SDK. Using more complex examples, you will learn about jobs, query parameters, asychronous calls and push notifications.

---

# Introduction

Last week we introduced the basic installation and usage of the Nuage VSPK using some script examples. This week we will continue our dive into this subject by introducing some advanced concepts.

We will again use some example scripts to explain these concepts in detail:

  * Creating ACLs policies and rules with Jobs
  * Gathering Statistics with Query Parameters
  * Asynchronous calls
  * Push notifications
  * Set Policy Groups on a VM depending on its name in vCenter by combining the Nuage VSPK with the vCenter SDK

Happy reading!

# Jobs

A Job is a task the VSD has to execute on an entity under its control. For instance if you use the GUI to export a domain template, in the background a Job is created on that specific domain template and the GUI will check the status of that job until it is finished. Once it is finished, the GUI will gather the job result, which in this case is the JSON export of the chosen Domain Template.

To create a job on an entity, you first create the Job object with the correct command (for a list, check the [API docs](https://nuagenetworks.github.io/vsd-api-documentation/v4_0/job.html)) and create it as a child of the entity:

{% highlight python %}
# Assuming import of vsdk, connected to the API as the nc variable
domain = nc.user.domains.get_first(filter='name == "Main VSPK Domain"')
job = vsdk.NUJob(command='EXPORT')

# Creating export job for the Main VSPK Domain
domain.create_child(job)
{% endhighlight %}

Once your job is created, the VSD will execute the job, you can check the status of the job by first using the `fetch()` method to get the latest information from the VSD and then checking the `status` property.

{% highlight python %}
import time
# Checking status of job
while True:
    job.fetch()
    if job.status == 'SUCCESS':
        break
    if job.status == 'FAILED':
        print "Job failed!"
        break
    time.sleep(1)
{% endhighlight %}

In the above example, we check the status of the job every second and if the status is either SUCCESS or FAILED we break the loop. In the latter case we also inform the user of this.

To get the result, you just need to get the result property of a successfully finished job.

{% highlight python %}
# Printing the export result
print job.result
# Output: JSON data of the Domain
{% endhighlight %}

## Job commands with input

There are also job commands which requires you to provide some input. The most interesting is the `IMPORT`  command, which is used to import previously exported, and possibly edited, entities like ACL policies, domains or domain templates. This can be accomplished with the `parameters` parameter which will take different types of input depending on the command.

For an import, it would look like the following example:

{% highlight python %}
# Getting a different enterprise
enterprise = vsdk.NUEnterprise(name="VSPK Import Enterprise")
nc.user.create_child(enterprise)

# Using the export from the previous code sample
import_job = vsdk.NUJob(command='IMPORT', parameters=job.result)
enterprise.create_child(import_job)
{% endhighlight %}

This will have copied the Main VSPK Domain from the VSPK Enterprise to a new enterprise called VSPK Import Enterprise.

## Creating ACL policies and rules with Jobs

If you have ever used the VSD GUI to create ACL policies and rules, you will have noticed the commit/rollback system that was introduced in Nuage VSP 3.2. This system allows you to make changes to your ACL policies and rules without impacting traffic until you are sure everything is configured correctly, at which point you can commit the changes and they are applied immediately.

This whole process uses jobs to change the state of the domain into policy editing mode and to commit these changes. The following script illustrates how this is done.

{% highlight python linenos %}
# Creating the job to begin the policy changes
job = vsdk.NUJob(command='BEGIN_POLICY_CHANGES')
domain.create_child(job)
# wait for the job to finish
# can be done with a while loop

# Creating a new Ingress ACL
ingressacl = vsdk.NUIngressACLTemplate(
    name='Middle Ingress ACL',
    priority_type='NONE', # Possible values: TOP, NONE, BOTTOM (domain only accepts NONE)
    priority=100,
    default_allow_non_ip=False,
    default_allow_ip=False,
    allow_l2_address_spoof=False,
    active=True
    )
domain.create_child(ingressacl)

# Creating a new Ingress ACL rule to allow database connectivity
# from the Web-Tier Zone to the DB-Tier Zone
from_network = domain.zones.get_first(filter='name == "Web-Tier"')
to_network = domain.zones.get_first(filter='name == "DB-Tier"')
db_ingressacl_rule = vsdk.NUIngressACLEntryTemplate(
    action='FORWARD',
    description='Allow MySQL DB connections from Web Tier',
    ether_type='0x0800',
    location_type='ZONE',
    location_id=from_network.id,
    network_type='ZONE',
    network_id=to_network.id,
    protocol='6',
    source_port='*',
    destination_port='3306',
    dscp='*'
    )
ingressacl.create_child(db_ingressacl_rule)

# Creating a new Ingress ACL rule to allow Web-Net VMs to
# talk to each other on port 80
network = domain.subnets.get_first(filter='name == "Web-Net"')
web_ingressacl_rule = vsdk.NUIngressACLEntryTemplate(
    action='FORWARD',
    description='Allow HTTP connections between Web-NET VMs',
    ether_type='0x0800',
    location_type='SUBNET',
    location_id=network.id,
    network_type='SUBNET',
    network_id=network.id,
    protocol='6',
    source_port='*',
    destination_port='80',
    dscp='*'
    )
ingressacl.create_child(web_ingressacl_rule)

# Applying the changes to the domain
job = vsdk.NUJob(command='APPLY_POLICY_CHANGES')
domain.create_child(job)
{% endhighlight %}

The above script will create a new middle ACL ingress policy inside the domain and will then create two rules inside that ingress policy. Let's look at it in a bit more detail.

### Entering the policy edit mode

Lines 2 and 3 show how you can create a job which will enter the domain in the policy edit mode. This will allow you to make changes to the ACLs without impacting the live environment before you are finished.

For this, the `BEGIN_POLICY_CHANGES` command is used.

In a normal case, you should always check for the job to be finished before starting to create ACLs. To limit the length of the code, we skipped that part. In the previous section we have shown an example of how to implement this check.

### Creating the ingress ACL policy

Lines 6 to 15 show how an ingress ACL policy is created. At first it might be confusing that you use the `NUIngressACLTemplate` object as this is not a template. In the VSD, a policy is always a template even if it is placed on an active domain. This template (and the other ACLs) is then used to compile a list of rules for each VM. This list of rules is used by the VRS to manage the traffic of the VM.

In this example we create a middle ACL policy which blocks all traffic and mac spoofing by default. We also make sure to activate the policy so that the rules will be applied when we commit the changes.

### Creating the first ingress ACL rule

Lines 19 to 34 show how we first find the two entities between which the rule will be applied. In this case we want to create a rule which allows all traffic on port 3306 from the Web-Tier zone to the DB-Tier zone.

Next, we create a new `NUIngressACLEntryTemplate` with the appropriate values. The first property we define is the `action` property. This can be two values: `FORWARD` or `DROP`. In this case we want to allow the traffic, so we use `FORWARD`.

We specify the `ether_type` and `protocol` to be IPv4 and TCP. By setting the `source_port` and `destination_port`  to appropriate values, we will allow traffic for the Web-Tier VMs to access the databases in the DB-Tier.

For the `location_type` (the source of the connection) the `ZONE` type is specified. We do the same for the `network_type` (the destination of the connection).  To define which zone to define as source and destination, we use the unique IDs of the two entities we gathered on lines 19 and 20 and insert them as the values for `location_id`  and `network_id` .

Finally, we tell the Ingress ACL policy to create a child from the defined Ingress ACL rule.

### Creating the second ingress ACL rule

For the second ingress ACL rule, we will do something similar to the first, but we will define this rule to allow traffic on port 80 within the Web-Net subnet. This will allow the separate VMs in the Web-Net subnet to send HTTP requests to each other.

Lines 38 to 52 are very similar to the previous section. The major difference here is that the `location_type` and the `network_type` are now set to be of type `SUBNET`, of course the corresponding ID properties are also adapted.

### Applying the changes

At this point, none of these ACL rules or the ACL policy is actually active, even tho we did define the policy to be active when we created it. It is created in a `DRAFT`  status:

{% highlight python %}
print ingressacl.policy_state
# Output:
# DRAFT
{% endhighlight %}

This is because the domain is still in a state of changing the policies. To commit these changes and make them active, we have to tell the domain to apply the changes. This is done with another job, this time we use the `APPLY_POLICY_CHANGES` command on lines 55 and 56.

Best practice is of course to check if the job has finished successfully before continuing.

### Background process

It is interesting to know what happens when entering the policy changes mode and how this might impact your scripts and tools. So we want to dedicate a short section on this.

Once you execute the job with the `BEGIN_POLICY_CHANGES` command, for each existing ACL policy, including its rules, a copy is made in the `DRAFT` status. These are different objects with different unique IDs than their active counterparts. It is important to make changes to these duplicate policies and rules instead of the actual live policies and rules.

At times, this can be confusing, when you are in the edit policy mode it is not allowed to edit the `LIVE` ACL policies or rules. The major consequence is that you need to get the correct ACL policy before editing it, being the one with the correct name and the `policy_state` set to `DRAFT`.

Below you can find a short example using iPython and its output to demonstrate this concept.

{% highlight bash %}
In [5]: for i in domain.ingress_acl_templates.get():
   ...:     print '%s - %s - %s' % (i.id, i.name, i.policy_state)
   ...:
c98cef48-725e-4ac0-b1a8-d2417b0b73e7 - Middle Ingress ACL - LIVE
40390f61-6a14-4a21-9f0e-0666a67d4322 - Bottom-AllowAll - LIVE

In [6]: job = vsdk.NUJob(command='BEGIN_POLICY_CHANGES')

In [7]: domain.create_child(job)
Out[7]:
(<vspk.v3_2.nujob.NUJob at 0x2bbab50>,
 <bambou.nurest_connection.NURESTConnection at 0x2bba650>)

In [8]: for i in domain.ingress_acl_templates.get():
    print '%s - %s - %s' % (i.id, i.name, i.policy_state)
   ...:
36802908-3eeb-46d8-aa02-e3f5b7278e17 - Middle Ingress ACL - DRAFT
c98cef48-725e-4ac0-b1a8-d2417b0b73e7 - Middle Ingress ACL - LIVE
40390f61-6a14-4a21-9f0e-0666a67d4322 - Bottom-AllowAll - LIVE

In [9]: job = vsdk.NUJob(command='APPLY_POLICY_CHANGES')

In [10]: domain.create_child(job)
Out[10]:
(<vspk.v3_2.nujob.NUJob at 0x2bd4490>,
 <bambou.nurest_connection.NURESTConnection at 0x2bd4dd0>)

In [11]: for i in domain.ingress_acl_templates.get():
    print '%s - %s - %s' % (i.id, i.name, i.policy_state)
   ....:
36802908-3eeb-46d8-aa02-e3f5b7278e17 - Middle Ingress ACL - LIVE
40390f61-6a14-4a21-9f0e-0666a67d4322 - Bottom-AllowAll - LIVE
{% endhighlight %}

Some interesting things to note here:

  * The Bottom-AllowAll policy does not get duplicated

  This policy is set on the domain template as a `BOTTOM` type of policy, which can not be changed in the domain context. It can only be changed on the domain template.

  * After entering the policy change mode, the Middle Ingress ACL appears twice, in different states. It is the one in the `DRAFT` state that can be changed.
  * Even without making any changes, if you apply the policy changes, the `LIVE` ACL policy gets deleted and the `DRAFT` one is changed to `LIVE` (the ID stays the same).

* * *

# Query Parameters

For some objects to be gathered, special GET parameters have to be used in the HTTP request to the API. As the Nuage VSPK takes care of all the HTTP calls, we need another way of specifying these special parameters.

Enter query parameters! This is a new parameter called `query_parameters` which can be used with the `get()` and `get_first()` methods of fetchers. The content of this parameter is a dict which contains the appropriate key and value pairs. These get translated to GET parameters in the HTTP call to the API.

## Gathering Statistics with Query Parameters

To demonstrate the query parameters, we will be investigating a script which gathers the statistics for a specified entity type. You can find the [gather_statistics.py](https://github.com/nuagenetworks/vspk-examples/blob/master/gather_statistics.py) script on the [Nuage Networks vspk-examples Github repository](https://github.com/nuagenetworks/vspk-examples/).

The script is called with a set of command line arguments which will specify for which type of entity it needs to gather certain statistics and for what time period.

We will only focus on a few interesting areas, feel free to investigate the rest of the script, of course.

### Determining the correct fetcher and getting the matching entities

To demonstrate some of the quick flexible calls that can be made with the Nuage VSPK, you can look at [line 189](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/gather_statistics.py#L189).

Here, with one simple call, we get all the entities matching the search criteria defined by the entity type and name (if defined).

### Determining the number of data points

To get the right amount of data from the statistics, it is important to request the correct amount of data points. The number of data points depends on the collection frequency and the time frame for which the statistics need to be gathered.

By default the collection frequency is set to 60 seconds, which means you get a statistics value every 60 seconds. When you request more data points (for instance 10 in per minute), you'll either get 0 values, or you will get strange results.

A way to change a collection frequency is to create a statistics policy on a given entity. [Lines 235 to 242](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/gather_statistics.py#L235-L242) first determines if the entity has a statistics policy defined. If it has, it will get the collection frequency.

Using either that collection frequency or the default (set on [line 226](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/gather_statistics.py#L226)), it will calculate the number of data points to gather.

### Gathering the statistics with the query parameters

The actual use of the query parameters can be seen on [lines 246-251](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/gather_statistics.py#L246-L251).

Statistics need to be gathered for a certain period, which is defined by the time when the script is started and the time frame the user specifies through the command line (default is 1 hour). You also need to specify a list of statistic metrics you want to get.

All this information is added as a dict to the `get_first()` methods `query_parameters` on the entity.

### Result

The below output is something you would see if you were to gather the statistics for all VMs for the metrics BYTES\_IN and BYTES\_OUT for the last 2 minutes.

{% highlight bash %}
$ python gather_statistics.py -e VM -E csp -H 10.167.43.64 -P 443 -p csproot -u csproot -s BYTES_IN -s BYTES_OUT -S -t 2m
+-----------------------------+-----------------+---------------+---------------------+---------------------+--------------+------------------+------------------+
|              Vm             | Start timestamp | End timestamp |   Start date/time   |    End date/time    | # datapoints |     BYTES_IN     |    BYTES_OUT     |
+-----------------------------+-----------------+---------------+---------------------+---------------------+--------------+------------------+------------------+
| PRD-WEB01 00:50:56:ac:44:6b |    1457084869   |   1457084989  | 2016-03-04 10:47:49 | 2016-03-04 10:49:49 |      2       | [347392, 908400] | [348300, 900046] |
| PRD-WEB02 00:50:56:ac:b0:58 |    1457084869   |   1457084989  | 2016-03-04 10:47:49 | 2016-03-04 10:49:49 |      2       | [402766, 908442] | [399092, 900046] |
+-----------------------------+-----------------+---------------+---------------------+---------------------+--------------+------------------+------------------+
{% endhighlight %}

* * *

# Asynchronous calls

The whole Nuage VSPK can be used in an asynchronous manner where you do not wait for an action to finish executing before continuing with your script. In this case you can use callback functions which will be called when the action has finished with the result of the action.

To enable an asynchronous action, you need to specify the `async=True` and the `callback`  parameters on the action. The [create_an_enterprise_asynchronously.py](https://github.com/nuagenetworks/vspk-examples/blob/master/create_an_enterprise_asynchronously.py) script on the [Nuage Networks vspk-examplkes Github repository](https://github.com/nuagenetworks/vspk-examples) is an example on how to create an enterprise asynchronously. Be aware this script uses the older format of importing the Nuage VSPK, if you installed your own generated version, you might need to change the import.

The important part of the code exists in two sections:

  * [Lines 13 to 19](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/create_an_enterprise_asynchronously.py#L13-L19): This represents a callback function, which will be called when the action finishes
  * [Lines 28 to 29](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/create_an_enterprise_asynchronously.py#L28-L29): Here an enterprise is created. You'll notice the two extra parameters when calling the `create_child()` method.

Asynchronous calls can be very useful when working on complex tools and they bring us to the next advanced concept: push notifications.

# Push notifications

Push notifications allow you to monitor for certain or all events and trigger actions appropriate to the event. This differs slightly from an asynchronous action: Instead of registering a callback function for a single action, you create a handler which will be called on each event the VSD receives.

The [show_pushcenter_notifications.py](https://github.com/nuagenetworks/vspk-examples/blob/master/show_pushcenter_notifications.py) script in the [Nuage Networks vspk-examples Github repository](https://github.com/nuagenetworks/vspk-examples) gives a basic example on how to use the push notifications. Be aware this script uses the older format of importing the Nuage VSPK, if you installed your own generated version, you might need to change the import.

## Defining a notification handler

It all starts with defining a function which will handle the data from the notification. In the example, on [lines 15-20](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/show_pushcenter_notifications.py#L15-L20), we create a function which will just print out the data into a pretty format.

## Registering the handler

Once we've created the handler, we need to register it with the `push_center`  and start the `push_center` . This is done through [lines 39 to 45](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/show_pushcenter_notifications.py#L39-L45).

From now on, the Nuage VSD is aware that for each event it registers, it needs to forward this information to the `push_center`  of that API connection. The `push_center`  will then call the handler with the data of the event.

## Using push notifications with Jobs

Remember the jobs we talked about before? You have to remember to check if the job has successfully finished before you can continue handling the result of that job.

Jobs also create events which will get pushed as a notification, so potentially, we could create a handler which specifically looks for those events. If we change the handler to the following code, we'll get a nice message when a job is done.

{% highlight python %}
def did_receive_push(data):
    """ Receive delegate
    """
    for event in data['events']:
        if event['entityType'] == 'job':
            print "Job with command %s - Status update: %s" % (event['entities'][0]['command'], event['entities'][0]['status'])
{% endhighlight %}

Let's test this with an export job on a domain while we run the push notification script:

{% highlight python %}
export_job = vsdk.NUJob(command='EXPORT')
domain.create_child(export_job)

# Output of the push notification script:
# Job with command EXPORT - Status update: RUNNING
# Job with command EXPORT - Status update: RUNNING
# Job with command EXPORT - Status update: SUCCESS
{% endhighlight %}

As you can see, you'll get regular updates on the status of the job. We could extend the handler to do all sorts of thing with the result of the job.

* * *

# Combining the Nuage VSPK with other SDKs

We've seen a lot of ways to use the Nuage VSPK as a standalone SDK to interact with your Nuage VSP environment and do lots of interesting tasks. Things can get even more interesting when you combine the Nuage VSPK with other systems SDKs.

You could write a script which deploys a full enterprise configuration from scratch in the Nuage VSP and simultaneously populates it with a set of VMs on ESXi or Openstack. Another possibility is to create a script which deploys a VM from a template in vCenter where you can select the enterprise, domain, zone, subnet inside your Nuage VSP, the script can then write those values into the advanced configuration parameters of the VM in vCenter before booting it ([this script actually exists](https://github.com/nuagenetworks/vspk-examples/blob/master/deploy_vsphere_template_with_nuage.py)).

To demonstrate this functionality, we'll have a look at a script called [vcenter_vm_name_to_nuage_policygroups.py](https://github.com/nuagenetworks/vspk-examples/blob/master/vcenter_vm_name_to_nuage_policygroups.py). As the name suggests, this script will look at the name of a VM inside vCenter and depending on a list of regular expressions (specified through a CSV file) will assign one or more Nuage Policy Groups to those VMs in the Nuage VSP. This script combines the Nuage VSPK with the vCenter SDK, using [pyvmomi](https://github.com/vmware/pyvmomi).

Once more we'll go through the important sections of the script.

## Gathering VMs to check and retreive Nuage metadata for each VM

The user can specify for which vCenter clusters the VMs need to be assigned to policy groups. The VMs are gathered through the vCenter API on [lines 256 to 259](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/vcenter_vm_name_to_nuage_policygroups.py#L256-L259).

Once there is a list of VMs to check, the Nuage metadata of the VM is checked and verified on [lines 281 to 293](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/vcenter_vm_name_to_nuage_policygroups.py#L281-L293).

## Finding the appropriate vPort for each VM

Policy groups are set on vPorts, so for each VM we need to get the vPort. For this, we first get the MAC address of the virtual network interface on the VMware VM on [line 319](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/vcenter_vm_name_to_nuage_policygroups.py#L319) through the vCenter API.

Using this MAC address, we retreive the VM Interface from inside the Nuage VSP on [line 328](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/vcenter_vm_name_to_nuage_policygroups.py#L328). From the VM Interface we can easily get the vPort, which is shown on [lines 334-336](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/vcenter_vm_name_to_nuage_policygroups.py#L334-336).

## Matching VM name to Policy Groups

[On lines 344 to 350](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/vcenter_vm_name_to_nuage_policygroups.py#L344-L350) we match the VM name using regular expressions to the specifications CSV file. This CSV file specifies that VMs which match a certain regular expression should get a certain Policy Group assigned. A VM can have multiple matches.

The structure of this CSV is pretty simple:

{% highlight bash %}
"<vCenter VM name regex>","<Policy Group>"
{% endhighlight %}

An example which we'll use later on:

{% highlight bash %}
".*DEV.*","Development"
".*PRD.*","Production"
".*WEB.*","Web"
".*DB.*","Database"
{% endhighlight %}

## Assigning the Policy Groups to the VM interface

On [line 354](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/vcenter_vm_name_to_nuage_policygroups.py#L354) we call the `update_nuage_policy_group()` function which is responsible of assigning the correct Policy Groups to the VM interface.

This function is defined on [lines 88 to 132](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/vcenter_vm_name_to_nuage_policygroups.py#L88-L132) and contains the following interesting sections:

  * [Lines 104 to 109](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/vcenter_vm_name_to_nuage_policygroups.py#L104-L109): If the existing policy groups need to be kept on the VM interface, we need to add them to the list of Policy Groups of the VM interface first.
  * [Lines 111 to 124](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/vcenter_vm_name_to_nuage_policygroups.py#L111-L124): For each policy group that needs to be assigned, we actually check if it exists in the domain to which the VM interface belongs.
  * [Line 127](https://github.com/nuagenetworks/vspk-examples/blob/8916e5d45a6bb818e71b4344d908fa1d003b673d/vcenter_vm_name_to_nuage_policygroups.py#L127): This is the crucial part where we assign the Policy Groups to the VM interface through the Nuage VSPK.

## The Assign method

You are probably wondering what this new `assign()` method does as this is the first time we encounter this method during this series.

The `assign()` method is used when you need to create a link between entities which are not in a normal parent-child relationship.

It could be described as a many to many relationship between certain entities. For instance: in this example, we assign Policy Groups to VM interfaces.

A Policy Group is not a child of a VM interface, as this would mean a Policy Group could only be assigned to one VM interface. Neither is a VM Interface a child of a Policy Group, because a VM interface could only have one Policy Group, and it would lose its connection to the VM owning that interface.

So the `assign()` method was introduced to create the relationship between these kind of entities.

It needs two arguments: a list of objects and the class of objects the list contains.

In our example the list of objects is the list of Policy Groups to assign and the class of object is the `NUPolicyGroup` class.

An important note on the workings of the `assign()` method: It will replace the existing links, not add. So if you want to add a link, you first need to get the existing objects as a list, and append the new one to that list before handing it over to the `assign()` method.

Another example of entities that use this method, is users in a group. You assign `NUUser` objects to a `NUGroup`.

## Result

By using the CSV file that was mentioned before and by running the script on all our VMs in our compute cluster, the VMs with 'PRD' in their name will get the Policy Group 'Production' assigned, VMs with 'DEV' in their name will get the Policy Group 'Development' assigned, and so on.

A VM called 'PRD-WEB01' will have two Policy Groups assigned: Production and Web. A VM called 'DEV-DB01' will have two different Policy Groups assigned: Development and Database.

These Policy Groups can be used to define ACL policies and rules. This makes it easy to create secure networks where the name of the VM dynamically assures the correct ACLs to be applied.

# The future: Support for more languages

As discussed in the previous post in this series, the Nuage VSPK is also available for Go. This will not be the only language that will get support for the Nuage VSPK as just this week, an additional feature has been added to [Monolithe](https://github.com/nuagenetworks/monolithe) to allow for plugins which would generate the Nuage VSPK for [different languages](https://github.com/nuagenetworks/monolithe/blob/master/doc/Language%20Plugins.md).

Other than that, with the continuous developments and improvements from the Nuage R&D, VSPK team and especially yourself, the [Nuage Networks vspk-examples Github repository](https://github.com/nuagenetworks/vspk-examples) will be filled and extended with new cool tools and script to use with Nuage VSP!

Enjoy your scripting freedom!
