---
layout: post
title: Exploring the Nuage vRealize Orchestrator Plugin - Part 1
author: Leonard Paquette
callout_image: nuage-vro-header.jpg
excerpt: If your Nuage VSP environment is integrated with VMware, then there's a good chance you are using vRealize Orchestrator (`vRO`) to automate many of your networking tasks.  The Nuage Networks VSP vRO Plugin operates within `vRO` to help you to manage your SDN by offering links to the Virtualized Services Directory (`VSD`) VSPK.  In Part 1 of this series, we provide screenshots from vRO to accompany steps in the plugin's installation guide and then walk through some examples of using the plugin to create, edit and remove a basic VSD object.

---
# Introduction
If your Nuage VSP environment is integrated with VMware, then there's a good chance you are using vRealize Orchestrator (`vRO`) to automate many of your networking tasks.  The Nuage Networks VSP vRO Plugin operates within `vRO` to help you to manage your SDN by offering links to the Virtualized Services Directory (`VSD`) VSPK.  In Part 1 of this series, we provide screenshots from vRO to accompany steps in the plugin's installation guide and then walk through some examples of using the plugin to create, edit and remove a basic VSD object.

# Product Overview
VMware is both a leader and pioneer in platform virtualization and cloud computing.  The company offers many products and tools to their customers to manage these functions, from bare-metal hypervisors to automation and deployment tools.  The VMware vRealize Suite is a complete Cloud Management Platform for managing an enterprise's private and public cloud resources.

The VMware vRealize Orchestrator (`vRO`) tool integrates with the vRealize Suite to automate network operations.  It offers an easy-to-use interface to combine VMware specific functions and third-party functions into `workflows` that can then be executed manually, scheduled for later execution, triggered from an external script, or run automatically after notification of an external network event.  With vRO, a user could assemble a set of tasks into workflows that interface with vCenter, Active Directory, PowerShell and other endpoints.  

In 2016, Nuage Networks announced the official release of its VSP vRO Plugin.  You can read the announcement and find links to download the plugin [here](../../../2016/12/13/Official-release-of-the-Nuage-vRO-plugin.html).  Instructions to install the latest version of the plugin can be found in the 'INSTALL.txt' file at the Github repository [here](https://github.com/nuagenetworks/vspk-vro/releases/tag/r5.2.2).  See the `Plugin Setup and Validation` Section below for a visual companion guide to the written instructions found in the 'INSTALL.txt' file.

Once you have the plugin installed, you will have access to hundreds of workflows that perform basic CRUD operations against all of the VSD objects in your SDN.  You can use these workflows in a stand-alone manner or embed them as components into larger, multi-step workflow processes.  For example, a workflow to provision a new VM into your Nuage environment might require a step to create VSD Subnet object, followed by a step to update the VM's network configuration in vCenter with the names of the newly created VSD objects and then a step to power-down, power-up and ping the VM.

# VSD Setup
To use the VSP vRO Plugin, you will need to connect to a running `VSD` server with sufficient update permissions.  You might already have access to a VSD test instance that is configured with admin credentials `csproot/csproot`, a default organization `csp` and a port number `8443`.  Please contact your network administrator to obtain adequate login and connection details.

A web interface called `VSA` (Virtualized Services Architect) uses the VSD RESTful API to provide a visual representation of the state of the `VSD` objects in your network.  We will use `VSA` throughout this post to verify the results of workflows that we construct and execute using the VSP vRO Plugin.

To access the `VSA`, enter an appropriate address and port in your browser based on the network location of your local `VSD`.  Your URL should resemble this :

```
https://198.51.100.108:8443/
```

If your `VSD` is running on the port that you have provided, you will see a login screen similar to this :

![VSA login screen](/img/posts/exploring-vro-part1/VSA-Login.png)

After entering valid credentials and organization, you will see a home page similar to this :

![VSA home page](/img/posts/exploring-vro-part1/VSA-Home-Page.png)

# Plugin Setup and Validation
Instructions for installing the VSP Plugin are in the 'INSTALL.txt' file [here](https://github.com/nuagenetworks/vspk-vro/releases/tag/r5.2.2).  In this section, we offer accompanying screenshots to help you ensure that the plugin is installed and operating properly.

1.  Verify that the VSP plugin has been installed.  It will be named `VSPK` and have a description such as `VSPK Plugin-in for vRealize Orchestrator`.  Log in to the VRO client and from the top-level menu `Help` option, select the `Installed plug-ins` option from the Help menu.  Ensure that the plug-in appears in the list of installed plugins :

![VRO Plugin Menu](/img/posts/exploring-vro-part1/VRO-Validation-Installed-Plugins.png)

![VRO List of Plugins](/img/posts/exploring-vro-part1/VRO-Validation-Plugin.png)

{:start="2"}
1.  The bundle of workflows that are provided with the plugin is known as the `Basic` package.  An additional package of `Advanced` workflows is available [here](https://github.com/nuagenetworks/vspk-vro-workflows/releases).  To install the Advanced package, follow the instructions in the 'INSTALL.txt' file.  Verify that the 2 packages are visible in your library.   Select the workflow icon from the top menu, then expand the `Library` folder, and the `VSPK` folder.   Two folders should appear called `Basic` and `Advanced` :

![VRO VSPK Basic Menu](/img/posts/exploring-vro-part1/VRO-Validation-VSPK-Basic-Menu.png)

{:start="3"}
1.  Establish a secure HTTP connection to your VSD instance by using the VSP plugin to create a new session.  This step is similar to creating a connection to a database before running SQL queries.  From the `Basic` folder, right-click the `Add Session` workflow item and then select the `Start workflow` option from the menu :

![VRO Session Menu](/img/posts/exploring-vro-part1/VRO-Validation-Session-Menu.png) ![VRO Session Start](/img/posts/exploring-vro-part1/VRO-Validation-Session-Start.png)

{:start="4"}
1.  A pop-up window appears into which 2 groups of parameters for the workflow must be supplied.  For the Authentication group, enter the first 4 parameters with similar values to those used earlier for the connection to the `VSA` and click the `Next` button.  For the Notifications group, select 'No' for both parameters.  Then click the `Submit` button from the bottom menu :

![VRO Session Args 1](/img/posts/exploring-vro-part1/VRO-Validation-Session-Args1.png) ![VRO Session Args 2](/img/posts/exploring-vro-part1/VRO-Validation-Session-Args2.png)

{:start="5"}
1.  Verify that the new session has been added to the Orchestrator's Inventory.  Select the Inventory icon from the top menu and then expand the VSPK folder :

![VRO Session Inventory](/img/posts/exploring-vro-part1/VRO-Validation-Session-Inventory.png)

# Use a Stand-alone Workflow
Once a VSD session has been created, it is automatically added to the vRO Inventory where it provides an entry point through which existing objects from the connected VSD instance are visible and associated workflows are executed.

The VSD models its objects as a tree structure with Parent-Child associations between pairs of objects.  At the root of the tree is the  `Me` object, which serves as a parent for many underlying child objects such as `Enterprise`, `VCenter`, and `VM`.

In this section, we will use a workflow provided by the VSP Plugin to create a new VSD Enterprise object.

{:start="1"}
1.  From the top-level Inventory menu option, expand the `VSPK` folder, then the VSD Session object.  Right-click the `Me` object and then click the `Run workflow ...` option from the pop-up menu :

![VRO Inventory Expand Me](/img/posts/exploring-vro-part1/VRO-Inventory-Expand-Me.png)

{:start="2"}
1.  Workflows associated with the `Me` object type are displayed in a separate "Chooser" dialog menu that appears when you right-click on the object.  From the Chooser menu, locate the `Add Enterprise to Me` workflow by entering a search filter or sorting on the name column.  Then execute the workflow by clicking the `Select` button :

![VRO Inventory Add Enterprise Select](/img/posts/exploring-vro-part1/VRO-Inventory-Add-Enterprise-Select.png)

{:start="3"}
1.  A pop-up window appears into which 2 parameters required by the workflow can be entered.  The first required parameter is a `Me` object value.   In this case, the `Me` object selected in Step 1 is provided by default.  The second required parameter is a name for the proposed Enterprise object.  Enter `My Little VRO Enterprise` as the Name value and then click the `Submit` button :

![VRO Inventory Add Enterprise Start](/img/posts/exploring-vro-part1/VRO-Inventory-Add-Enterprise-Start.png)

{:start="4"}
1. A small pop-up window appears indicating that the workflow has begun exection  :
 
![VRO Inventory Add Enterprise Running](/img/posts/exploring-vro-part1/VRO-Inventory-Add-Enterprise-Running.png)

{:start="5"}
1.  If the workflow in the previous step completed successfully, then the new enterprise will be visible as an object in the VRO Inventory.  Expand the `Me` object from the Inventory menu and then right-click the `Enterprises` object and select the `Reload` option from the small pop-up menu.  The most recent list of Enterprise objects from your instance of VSD will be displayed :

![VRO Add Enterprise Reload VRO](/img/posts/exploring-vro-part1/VRO-Inventory-Add-Enterprise-Reload-VRO.png) ![VRO Add Enterprise See VRO](/img/posts/exploring-vro-part1/VRO-Inventory-Add-Enterprise-See-VRO.png)

{:start="6"}
1.  When a VSD object is selected from the VRO Inventory menu in the left pane, its attributes are displayed in the right pane.  For our purposes, we are interested in the ID attribute of the new enterprise object.  It may be necessary to scroll the screen in order to find the ID attribute.  Make note of the ID value as we will use it later as a validation item when we create custom workflows :

![VRO Inventory Add Enterprise See ID Value](/img/posts/exploring-vro-part1/VRO-Inventory-Add-Enterprise-See-ID-Value.png)

{:start="7"}
1.  The new enterprise will also be visible as an object in `VSA` (Virtualized Services Architect), where its attributes can be displayed.  Select the new enterprise object and then choose the `Inspect` option from the small pop-up menu.  Ensure that the  Enterprise ID value matches the value from the previous step :

![VRO Inventory Add Enterprise See VSA](/img/posts/exploring-vro-part1/VRO-Inventory-Add-Enterprise-See-VSA.png) ![VRO Inventory Add Enterprise See VSA ID](/img/posts/exploring-vro-part1/VRO-Inventory-Add-Enterprise-See-VSA-ID.png)

# Building a Custom Workflow

The Nuage Networks VSP vRO Plugin provides an extensive set of workflows that can perform basic maintenance tasks on VSD objects.  In addition, those workflows can be combined with your own custom designed workflows to perform more complex tasks in your network environment.

In these next sections, we will design a custom workflow that invokes 3 Nuage VSP plugin workflows to find, edit and then delete the VSD Enterprise object that we created in the previous section.

## <span style="color: purple">Create the Custom Workflow</span>

{:start="1"}
1.  To begin, create a workspace for your new custom workflow.  From the top-level `Workflow` menu option, expand the `Administrator` folder and then expand the `Library` folder below it.  Right-click on the `Library` folder and then select the `Add folder` option from the pop-up menu that appears.  When prompted for a new folder name, enter `My Custom Workflow` and then click the `Ok` button :

![VRO Custom New Folder Start](/img/posts/exploring-vro-part1/VRO-Custom-New-Folder-Start.png) ![VRO Custom New Folder Create](/img/posts/exploring-vro-part1/VRO-Custom-New-Folder-Create.png)

{:start="2"}
1.  The new folder will be displayed in the folder list in the left pane :

![VRO Custom New Folder Locate](/img/posts/exploring-vro-part1/VRO-Custom-New-Folder-Locate.png)

{:start="3"}
1.  Select the new folder and then right-click on it to display the pop-up folder options menu.  Select the `New workflow` option.  When prompted for a new workflow name, enter `My Enterprise Handler` and then click the `Ok` button :

![VRO Custom New Workflow Start](/img/posts/exploring-vro-part1/VRO-Custom-New-Workflow-Start.png) ![VRO Custom New Workflow Create](/img/posts/exploring-vro-part1/VRO-Custom-New-Workflow-Create.png)

{:start="4"}
1.  The screen will convert to `Edit` mode for the custom workflow as shown below :

![VRO Custom New Workflow Edit](/img/posts/exploring-vro-part1/VRO-Custom-New-Workflow-Edit.png)

## <span style="color: purple">Add the 1st Workflow Element - Finding an Enterprise</span>

{:start="1"}
1.  Remain on the `Schema` tab of the workflow editor and select the `Generic` menu in the left pane.  Drag the `Workflow element` from the group of Generic elements in the left pane to the workflow diagram in the right pane and release it between the `Start` element and `End` element.  When prompted for a Workflow name in the Search box, enter part or all of the string `Find Enterprise in Me` and then double-click the workflow from the list to add it to the schema :

![VRO Custom Find Enterprise Insert](/img/posts/exploring-vro-part1/VRO-Custom-Find-Enterprise-Insert.png) ![VRO Custom Find Enterprise Search](/img/posts/exploring-vro-part1/VRO-Custom-Find-Enterprise-Search.png)

{:start="2"}
1.  Hover your mouse over the `Find Enterprise in Me` Workflow element to confirm details such as name and path :

![VRO Custom Find Enterprise Display](/img/posts/exploring-vro-part1/VRO-Custom-Find-Enterprise-Display.png)

{:start="3"}
1.  The `Find Enterprise in Me` workflow element that we are adding requires 2 input parameters and 1 output parameter.  In response to the prompt `Do you want to add the activity's parameters as input/output to the current workflow`, click on the `Setup` button.  A pop-up screen will be displayed showing the types and names of the 3 parameters.  Click on the `Promote` button to accept the default promotion behavior for all parameters :

![VRO Custom Find Enterprise Params](/img/posts/exploring-vro-part1/VRO-Custom-Find-Enterprise-Params.png)

## <span style="color: purple">Add the 1st Scriptable Task Element - Output Original Enterprise Name</span>

{:start="1"}
1.  In its current state, the custom workflow will use the plugin to locate a VSD Enterprise object, but there is nothing else in the workflow to utilize that object.  Let's add some code to output some attributes from that Enterprise object to the console. Drag the `Scriptable task` element from the group of Generic elements in the left pane to the workflow diagram in the right pane and release it between the `Find Enterprise in Me` element and `End` element :

![VRO Custom Scriptable Task Insert](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-Insert.png)

{:start="2"}
1.  The screen will open additional panes at the bottom where you will be able to add JavaScript code.  Select the `Scripting` menu option and enter the code as shown : 

![VRO Custom Scriptable Task Prepare](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-Prepare.png)

{:start="3"}
1.  The current JavaScript code refers to the output parameter named `enterpriseObj`.  However, as an "output parameter", VRO does not support its usage as an "input parameter" within the custom workflow.  It must instead be converted to an `Attribute`, which can serve as an input or output value for all elements.  To perform the conversion, select the `Outputs` option from the top-level menu, and then select the `enterpriseObj` parameter.  In the `Parameters` section, click the `Move as attribute` button :

![VRO Custom Scriptable Task Attribute](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-Attribute.png)

{:start="4"}
1.  The `enterpriseObj` parameter is now visible as an Attribute on the `General` menu option :

![VRO Custom Scriptable Task General](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-General.png)

{:start="5"}
1.  You can now wire the new Attribute to the Scriptable Task.  From the top-level menu, select the `Schema` option and then click the `Scriptable task` element.  In the bottom pane, select the `Visual Binding` option.  The `enterpriseObj` parameter is now designated as an `In Attribute` and can be used as input to your scriptable task :

![VRO Custom Scriptable Task Wire](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-Wire.png)

{:start="6"}
1.  Highlight the attribute and drag it from the `In Attributes` panel to the `IN` side of the `Scriptable task` panel :

![VRO Custom Scriptable Task Drag](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-Drag.png)

{:start="7"}
1.  Switch to the `Scripting` tab in the bottom pane.  The `enterpriseObj` is now confirmed to be a valid parameter and its occurrences in the JavaScript code change color :
 
![VRO Custom Scriptable Task Runnable](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-Runnable.png)

{:start="8"}
1.  The custom workflow is now ready to run.  Click the `Save and close` button in the bottom pane : 

![VRO Custom Scriptable Task Save](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-Save.png)

## <span style="color: purple">Execute the Custom Workflow</span>

{:start="1"}
1.  There are 2 options for executing the custom workflow from the menu.  For option 1, select your custom workflow from the `Workflows` left pane, right-click and then click the `Start workflow ...` item from the pop-up menu.  For option 2, select your custom workflow, and then click the green arrow along the top menu :

![VRO Custom New Workflow Run 01](/img/posts/exploring-vro-part1/VRO-Custom-New-Workflow-Run-01.png) ![VRO Custom New Workflow Run 02](/img/posts/exploring-vro-part1/VRO-Custom-New-Workflow-Run-02.png)

{:start="2"}
1.  A pop-up window appears into which 2 parameters required by the custom workflow can be entered.  The first required parameter is a `Me` object value.   Click the `Not set` value for the `Me` object <span style="color: black;font-weight:bold">( 1 )</span>.  Another pop-up window appears where you can browse the Inventory to locate an available `Me` object <span style="color: black;font-weight:bold">( 2 )</span> :

![VRO Custom New Workflow Run 03](/img/posts/exploring-vro-part1/VRO-Custom-New-Workflow-Run-03.png) ![VRO Custom New Workflow Run 04](/img/posts/exploring-vro-part1/VRO-Custom-New-Workflow-Run-04.png)

{:start="3"}
1.  Select your VSD `Session` and the `Me` object <span style="color: black;font-weight:bold">( 3 )</span>.  Then click the `Select` button <span style="color: black;font-weight:bold">( 4 )</span> :

![VRO Custom New Workflow Run 05](/img/posts/exploring-vro-part1/VRO-Custom-New-Workflow-Run-05.png)

{:start="4"}
1.  The first pop-up window reappears and now displays the selected `Me` object.  For the `Filter` parameter, enter value `My Little VRO Enterprise` <span style="color: black;font-weight:bold">( 5 )</span> and click the `Submit` button <span style="color: black;font-weight:bold">( 6 )</span> :

![VRO Custom New Workflow Run 06](/img/posts/exploring-vro-part1/VRO-Custom-New-Workflow-Run-06.png) 

{:start="5"}
1.  The custom workflow will begin execution and run for a few seconds.  Select the `Logs` option in the bottom pane <span style="color: black;font-weight:bold">( 7 )</span>.  Note that the ID value from your enterprise object is shown in the console and matches the ID shown earlier :

![VRO Custom New Workflow Run 07](/img/posts/exploring-vro-part1/VRO-Custom-New-Workflow-Run-07.png)

# Expand the Custom Workflow to Edit the Enterprise

In this section, we will expand the custom workflow to include an additional out-of-the-box workflow to illustrate how to edit some of the attributes of a VSD Enterprise object.
 
## <span style="color: purple">Add the 2nd Workflow Element - Editing an Enterprise</span>

{:start="1"}
1.  From the `Schema` tab of the workflow editor, select the `Generic` menu in the left pane.  Drag the `Workflow element` from the group of Generic elements in the left pane to the workflow diagram in the right pane and release it between the `Scriptable task` element and `End` element.  When prompted for a Workflow name in the Search box, enter part or all of the string `Edit Enterprise` and then double-click the workflow from the list to add it to the schema :

![VRO Custom Edit Enterprise Insert](/img/posts/exploring-vro-part1/VRO-Custom-Edit-Enterprise-Insert.png) ![VRO Custom Edit Enterprise Search](/img/posts/exploring-vro-part1/VRO-Custom-Edit-Enterprise-Search.png)

{:start="2"}
1.  Hover your mouse over the `Edit Enterprise` Workflow element to confirm details such as name and path :

![VRO Custom Edit Enterprise Display](/img/posts/exploring-vro-part1/VRO-Custom-Edit-Enterprise-Display.png)

{:start="3"}
1.  The `Edit Enterprise` workflow element that we are adding requires 5 input parameters.  In response to the prompt `Do you want to add the activity's parameters as input/output to the current workflow`, click on the `Setup` button.  A pop-up screen will be displayed showing the types and names of the 5 parameters.  Click on the `Promote` button to accept the default promotion behavior for all parameters :

![VRO Custom Edit Enterprise Params](/img/posts/exploring-vro-part1/VRO-Custom-Edit-Enterprise-Params.png)

{:start="4"}
1.  After promoting all of the parameters used by the `Edit Enterprise` workflow element, the `Visual Binding` pane opens at the bottom of the screen.  It indicates that the Enterprise object to be edited will be the same object located by the `Find Enterprise in Me` element and that there are 4 other inputs to the `Edit Enterprise` element representing 4 potential attributes that can be modified :

![VRO Custom Edit Enterprise Review](/img/posts/exploring-vro-part1/VRO-Custom-Edit-Enterprise-Review.png)

## <span style="color: purple">Add the 2nd Scriptable Task Element - Output Revised Enterprise Name</span>

{:start="1"}
1.  The purpose of the `Edit Enterprise` workflow element is to modify some of the attributes for a given VSD Enterprise object.  We will now include more JavaScript code to output a revised `Name` attributes for that Enterprise object. Drag the `Scriptable task` element from the group of Generic elements in the left pane to the workflow diagram in the right pane and release it between the `Edit Enterprise` element and `End` element :

![VRO Custom Scriptable Task 2 Insert](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-2-Insert.png)

{:start="2"}
1.  The screen will open additional panes at the bottom where you will be able to add JavaScript code.  Select the `Scripting` menu option and enter the code as shown :

![VRO Custom Scriptable Task 2 Prepare](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-2-Prepare.png)

{:start="3"}
1.  To edit the same Enterprise object as the one located by the `Find Enterprise in Me` workflow element, you need to wire the object to the second Scriptable Task.  From the top-level menu, select the `Schema` option and then click the second `Scriptable task` element.  In the bottom pane, select the `Visual Binding` option.  The `enterpriseObj` parameter is designated as an `In Attribute` and can be used as input to the second scriptable task :

![VRO Custom Scriptable Task 2 Wire](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-2-Wire.png)

{:start="4"}
1.  Highlight the attribute and drag it from the `In Attributes` panel to the `IN` side of the `Scriptable task` panel :

![VRO Custom Scriptable Task 2 Drag](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-2-Drag.png)

{:start="5"}
Switch to the `Scripting` tab in the bottom pane.  The `enterpriseObj` is now confirmed to be a valid parameter and its occurrences in the JavaScript code change color :

![VRO Custom Scriptable Task 2 Runnable](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-2-Runnable.png)

{:start="6"}
1.  The revised custom workflow is now ready to run.  Click the `Save and close` button in the bottom pane :

![VRO Custom Scriptable Task 2 Save](/img/posts/exploring-vro-part1/VRO-Custom-Scriptable-Task-2-Save.png)

## <span style="color: purple">Execute the Revised Custom Workflow</span>

{:start="1"}
1.  There are 2 options for executing the custom workflow from the menu.  For option 1, select your custom workflow from the `Workflows` left pane, right-click and then click the `Start workflow ...` item from the pop-up menu.  For option 2, select your custom workflow, and then click the green arrow along the top menu :

![VRO Custom Rev1 Workflow Run 01](/img/posts/exploring-vro-part1/VRO-Custom-Rev1-Workflow-Run-01.png) ![VRO Custom Rev1 Workflow Run 02](/img/posts/exploring-vro-part1/VRO-Custom-Rev1-Workflow-Run-02.png)

{:start="2"}
1.  A pop-up window appears into which the parameters referenced by the revised custom workflow can be entered.  There are now 6 possible input parameters.  The first two are used by the first workflow element and the last four are the enterprise attributes that can be modified by the second workflow element.  The first required parameter is the same `Me` object value that you selected previously.   Click the `Not set` value for the `Me` object <span style="color: black;font-weight:bold">( 1 )</span>.  Another pop-up window will appear where you can browse the Inventory to locate an available `Me` object <span style="color: black;font-weight:bold">( 2 )</span> :

![VRO Custom Rev1 Workflow Run 03](/img/posts/exploring-vro-part1/VRO-Custom-Rev1-Workflow-Run-03.png) ![VRO Custom Rev1 Workflow Run 04](/img/posts/exploring-vro-part1/VRO-Custom-Rev1-Workflow-Run-04.png)

{:start="3"}
1.  Select your VSD `Session` and the `Me` object <span style="color: black;font-weight:bold">( 3 )</span>.  Then click the `Select` button <span style="color: black;font-weight:bold">( 4 )</span> :

![VRO Custom Rev1 Workflow Run 05](/img/posts/exploring-vro-part1/VRO-Custom-Rev1-Workflow-Run-05.png)

{:start="4"}
1.  The first pop-up window reappears and now displays the selected `Me` object.  For the `Filter` parameter, enter value `My Little VRO Enterprise` <span style="color: black;font-weight:bold">( 5 )</span>.  For the set of 4 Enterprise attribute parameters, leave the first 3 of them empty and enter value `My Small VRO Enterprise` for the `name` parameter <span style="color: black;font-weight:bold">( 6 )</span>.  Then click the `Submit` button <span style="color: black;font-weight:bold">( 7 )</span> :

![VRO Custom Rev1 Workflow Run 06](/img/posts/exploring-vro-part1/VRO-Custom-Rev1-Workflow-Run-06.png)

{:start="5"}
1.  The revised custom workflow will execute for a few seconds.  Select the `Logs` option in the bottom pane <span style="color:black;font-weight:bold">( 8 )</span>.  Note that in the log we see that the ID for our enterprise has not changed but the name has been revised :

![VRO Custom Rev1 Workflow Run 07](/img/posts/exploring-vro-part1/VRO-Custom-Rev1-Workflow-Run-07.png)

# Expand the Custom Workflow to Remove the Enterprise

In this section, we will add a final workflow element to the custom workflow to demonstrate how to remove a VSD Enterprise object.

## <span style="color: purple">Add the 3rd Workflow Element - Removing an Enterprise</span>

{:start="1"}
1.  From the `Schema` tab of the workflow editor, select the `Generic` menu in the left pane.  Drag the `Workflow element` from the group of Generic elements in the left pane to the workflow diagram in the right pane and release it between the second `Scriptable task` element and `End` element.  When prompted for a Workflow name in the Search box, enter part or all of the string `Remove Enterprise` and then double-click the workflow from the list to add it to the schema.  Hover your mouse over the element to confirm details such as name and path :

![VRO Custom Remove Enterprise Insert](/img/posts/exploring-vro-part1/VRO-Custom-Remove-Enterprise-Insert.png) ![VRO Custom Remove Enterprise Search](/img/posts/exploring-vro-part1/VRO-Custom-Remove-Enterprise-Search.png)

{:start="2"}
1.  Hover your mouse over the `Remove Enterprise` Workflow element to confirm details such as name and path :

![VRO Custom Remove Enterprise Display](/img/posts/exploring-vro-part1/VRO-Custom-Remove-Enterprise-Display.png)

{:start="3"}
1.  The `Remove Enterprise` workflow element that we are adding requires 1 input parameter which is the Enterprise object to be removed.  Open the `Visual Binding` pane open at the bottom of the screen.  It shows that the Enterprise object attribute has already been linked to the input parameter for the new workflow, indicating that the Enterprise object to be removed will be the same object processed by the other workflow elements :

![VRO Custom Remove Enterprise Review](/img/posts/exploring-vro-part1/VRO-Custom-Remove-Enterprise-Review.png)

{:start="4"}
1.  The revised custom workflow is now ready to run.  Click the `Save and close` button in the bottom pane :

![VRO Custom Remove Enterprise Save](/img/posts/exploring-vro-part1/VRO-Custom-Remove-Enterprise-Save.png)

## <span style="color: purple">Execute the Final Custom Workflow</span>

{:start="1"}
1.  Before executing the workflow, verify that the enterprise is still visible as an object in the VRO Inventory.  Expand the `Me` object from the Inventory menu and then right-click the `Enterprises` object and select the `Reload` option from the small pop-up menu.  The most recent list of Enterprise objects from your instance of VSD will be displayed.  You should see that the enterprise still exists and is named `My Small VRO Enterprise` :

![VRO Rev2 Enterprise Reload VRO](/img/posts/exploring-vro-part1/VRO-Inventory-Rev2-Enterprise-Reload-VRO.png) ![VRO Rev2 Enterprise See VRO](/img/posts/exploring-vro-part1/VRO-Inventory-Rev2-Enterprise-See-VRO.png)

{:start="2"}
1.  There are 2 options for executing the final custom workflow from the menu.  For option 1, select your custom workflow from the `Workflows` left pane, right-click and then click the `Start workflow ...` item from the pop-up menu.  For option 2, select your custom workflow, and then click the green arrow along the top menu :

![VRO Custom Rev2 Workflow Run 01](/img/posts/exploring-vro-part1/VRO-Custom-Rev2-Workflow-Run-01.png) ![VRO Custom Rev2 Workflow Run 02](/img/posts/exploring-vro-part1/VRO-Custom-Rev2-Workflow-Run-02.png)

{:start="3"}
1.  A pop-up window appears into which the parameters referenced by the final custom workflow can be entered.  There are still the same 6 possible input parameters as before.  The first required parameter is the same `Me` object value that you selected previously.   Click the `Not set` value for the `Me` object <span style="color: black;font-weight:bold">( 1 )</span>.  Another pop-up window will appear where you can browse the Inventory to locate an available `Me` object <span style="color: black;font-weight:bold">( 2 )</span> :

![VRO Custom Rev2 Workflow Run 03](/img/posts/exploring-vro-part1/VRO-Custom-Rev2-Workflow-Run-03.png) ![VRO Custom Rev2 Workflow Run 04](/img/posts/exploring-vro-part1/VRO-Custom-Rev2-Workflow-Run-04.png)

{:start="4"}
1.  Select your VSD `Session` and the `Me` object <span style="color: black;font-weight:bold">( 3 )</span>.  Then click the `Select` button <span style="color: black;font-weight:bold">( 4 )</span> :

![VRO Custom Rev2 Workflow Run 05](/img/posts/exploring-vro-part1/VRO-Custom-Rev2-Workflow-Run-05.png)

{:start="5"}
1.  The first pop-up window reappears and now displays the selected `Me` object.  For the `Filter` parameter, enter value `My Small VRO Enterprise` <span style="color: black;font-weight:bold">( 5 )</span>.  For the set of 4 Enterprise attribute parameters, leave the first 3 of them empty and enter value `My Very Temporary VRO Enterprise` for the `name` parameter <span style="color: black;font-weight:bold">( 6 )</span>.  Then click the `Submit` button <span style="color: black;font-weight:bold">( 7 )</span> :

![VRO Custom Rev2 Workflow Run 06](/img/posts/exploring-vro-part1/VRO-Custom-Rev2-Workflow-Run-06.png)

{:start="6"}
1.  The final custom workflow will execute for a few seconds.  Select the `Logs` option in the bottom pane <span style="color:black;font-weight:bold">( 8 )</span>.  The log content will resemble that of the prior workflow execution :

![VRO Custom Rev2 Workflow Run 07](/img/posts/exploring-vro-part1/VRO-Custom-Rev2-Workflow-Run-07.png)

{:start="7"}
1.  After executing the workflow, verify that the enterprise is no longer visible as an object in the VRO Inventory.  Expand the `Me` object from the Inventory menu and then right-click the `Enterprises` object and select the `Reload` option from the small pop-up menu.  The most recent list of Enterprise objects from your instance of VSD will be displayed.  Note that the enterprise no longer exists :

![VRO Rev2 Enterprise Reload 2 VRO](/img/posts/exploring-vro-part1/VRO-Inventory-Rev2-Enterprise-Reload2-VRO.png) ![VRO Rev2 Enterprise See 2 VRO](/img/posts/exploring-vro-part1/VRO-Inventory-Rev2-Enterprise-See2-VRO.png)

# Conclusion
In this part of our VRO series, we introduced the Nuage Networks VSP vRO Plugin and walked through some basic examples of how you can use it to manage your VSD objects.  In Part 2, we will discuss how VSD objects can be referenced by the Nuage Plugin using Actions (custom Javascript functions) and Configuration Elements (VRO server-wide constants).
