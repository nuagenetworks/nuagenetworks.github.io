---
layout: post
title: VSPK For .Net
author: Patrick Dumais
callout_image: nuage-community-header.jpg
tags: nuage, c#, .net, VSPK
excerpt: Nuage Networks has released a .Net VSPK. I will show how to use it with powershell and c#
---


# Introduction

For a while now, we've had VSPKs for popular languages such as Python, Java, Go and some more. 
One important language that was missing is C#, or more generaly, .Net. So Nuage Networks is proud to 
announce a new c# Bambou and c# VSPK. 

If you don't know what a VSPK is, it is a library that wraps the Nuage API into objects that are easier to use when building
custom integrations with Nuage. So instead of having to deal with an http client library and having to understand how the 
Nuage ReST API works in detail, developers can simply create objects like: `Enterprise enterprise = new Enterprise();`

Of course, having a c# library means having a .Net library. Or as they like to call it, a .Net Assembly. So the VSPK can be used by:

  * Powershell
  * asp.net
  * c#/vb.net
  * and anything else that supports .Net Dlls.

# Getting started
The VSPK has a depedency on NewtonSoft JSON and Bambou. Both of these dependencies, along with the VSPK itself, are 
available in [nuget](https://www.nuget.org/). It is also possible to download the vspk and bambou assemblies directly from github
at <https://github.com/nuagenetworks/vspk-csharp/releases> and <https://github.com/nuagenetworks/csharp-bambou/releases> respectively

The Bambou assembly will rarely change so the version should be stable. The VSPK is auto-generated. Everytime that a new 
specification of the Nuage API is released, the VSPK will be auto-generated and the assembly will be released shortly after.

## Usage in a c# project
I am going to use a simple Winform Project to demonstrate how to use the VSPK. I am using Visual Studio Community 2017.
The first step is to create a project. In Visual Studio, go in File -> New -> Project. Select "Windows Forms App (.NET Framework)
as the type of project to create and click "OK".

![]({{ site.baseurl}}/img/posts/vspk.net/create_project.png "Create a Project")

Next, Add the required dependencies: NewtonSoft JSON, Bambou and VSPK. This is done by right-clicking "References" under the new
project in the solution explorer, then click "Manage Nuget packages"
![]({{ site.baseurl}}/img/posts/vspk.net/managenuget.png "Manage Nuget Packages")

A new tab will appear, click on the "Browse" button and search for bambou, select the search result and click "Install"
![]({{ site.baseurl}}/img/posts/vspk.net/installbambou.png "Install Bambou")

Now do the same for "VSPK" and "newtonsoft.json". After installing all 3 dependencies, you should see them in the 
solution explorer:
![]({{ site.baseurl}}/img/posts/vspk.net/references.png "References")

This will have created a file "packages.config" in your project directory. This file contains information about how to find
those 3 dependencies in nuget. So make sure you distribute that file with your project.

Now we can start writing some code. Go in the tab "Form1.cs" and double click on the form. This will take you in the code view
in a handler called "Form1_Load". This handler will be invoked when the form loads. Perfect place to test our code. In the 
header of the file, add a using clause for "net.nuagenetworks.vspk.v5_0" and "net.nuagenetworks.vspk.v5_0.fetchers".

![]({{ site.baseurl}}/img/posts/vspk.net/coderef.png "Code references")

Under the Form1_Load method, create a session
```
VSDSession session = new VSDSession("csproot", "csproot", "csp", "http://vsd.local:8443");
```

Then, to retrieve a list of enterprise:
```
VSDSession session = new VSDSession("csproot", "csproot", "csp", "http://vsd.local:8443");
EnterprisesFetcher enterprises = session.getMe().getEnterprises();
List<Enterprise> list = enterprises.fetch(session);
foreach (Enterprise enterprise in list)
{
    string enterpriseName = enterprise.NUName;
}
```

If you run that application and put a breakpoint, you should see the variable `enterpriseName` being updated with the
name of all the enterprises in the VSD. Of course, one might want to create a more fancy application that displays 
those names in a ListBox. The [VSPK Examples](https://github.com/nuagenetworks/vspk-examples) repo on github has such an example.

## Usage in Powershell
To use the VSPK from powershell, you will need to download all three DLLs (bambou, vspk and newtonsoft.json). They are all
available on github. In this example, I have created a folder at `c:\vspk` and I stored the 3 dlls in there. Now we need
to start a powershell instance and got to that directory. I also have a notepad++ instance for editing my powershell script.
My script is `c:\vspk\nuage.psm1`. I wrote a small script that allows me to create an enterprise

```
[Reflection.Assembly]::LoadFrom("C:\vspk\Newtonsoft.Json.dll")
[Reflection.Assembly]::LoadFrom("C:\vspk\net.nuagenetworks.bambou.dll")
[Reflection.Assembly]::LoadFrom("C:\vspk\net.nuagenetworks.vspk.dll")

function New-Enterprise($name) {
    $s = new-object net.nuagenetworks.vspk.v5_0.VSDSession -argumentlist "csproot", "csproot", "csp", "https://135.121.117.224"
    $e = new-object net.nuagenetworks.vspk.v5_0.Enterprise
    $e.NUName = $name
    $s.getMe().createChild($s,$e);
    return $e.NUId
}

function New-Network($enterprise,$subnet,$netmask,$gateway) {
    $s = new-object net.nuagenetworks.vspk.v5_0.VSDSession -argumentlist "csproot", "csproot", "csp", "https://135.121.117.224"
    $e = new-object net.nuagenetworks.vspk.v5_0.Enterprise
    $e.NUId = $enterprise
    $e.fetch($s)
    
    $dt = new-object net.nuagenetworks.vspk.v5_0.DomainTemplate
    $dt.NUName = "domaintemplate1"
    $e.createChild($s,$dt)

    $d = new-object net.nuagenetworks.vspk.v5_0.Domain
    $d.NUName = "domain1"
    $d.NUTemplateID = $dt.NUId
    $e.createChild($s,$d)

    $z = new-object net.nuagenetworks.vspk.v5_0.Zone
    $z.NUName = "zone1"
    $d.createChild($s,$z)

    $sub = new-object net.nuagenetworks.vspk.v5_0.Subnet
    $sub.NUName = "subnet1";
    $sub.NUNetmask = $netmask
    $sub.NUGateway = $gateway
    $sub.NUAddress = $subnet
    $z.createChild($s,$sub)
}

Export-ModuleMember -Function 'New-Enterprise'
Export-ModuleMember -Function 'New-Network'
```

Now we need to import the module and we can run it:
```
Import-Module .\nuage.psm1 -Force
$e = New-Enterprise "Test-123456"
New-Network $e "192.168.1.0" "255.255.255.0" "192.168.1.1"
```

# Conclusion
So there it is. We can now use high level objects that wraps the Nuage VSD API in .Net. 
.Net assemblies can be used by powershell, c# and ASP.Net. You can find more examples in 
the [VSPK-Examples github repo](https://github.com/nuagenetworks/vspk-examples).
    

