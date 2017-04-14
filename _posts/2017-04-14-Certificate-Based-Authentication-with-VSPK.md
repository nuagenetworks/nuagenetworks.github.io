---
layout: post
title: Certificate based authentication with VSPK
author: Philippe Dellaert
callout_image: nuage-community-header.jpg
tags: VSPK, API, Security, Authentication, Certificate
excerpt: When using our API or VSPK, authentication is always required as a good security practice. Most users will know about and use the username/password authentication method. Additionally, Nuage API and VSPKs also support certificate based authentication. This blog post goes into more detail on how to use certificate based authentication and its advantages.

---

# Introduction
When using our API or VSPK, authentication is always required as a good security practice. Most users will know about and use the username/password authentication method. Additionally, Nuage API and VSPKs also support certificate based authentication. This blog post goes into more detail on how to use certificate based authentication and its advantages.

If you use the username/password authentication, this would mean that you provide a username, password and enterprise inside your script or tool that uses the VSPK which are used to get an API token. 

This API token is valid for 24 hours, after which it needs to be renewed. Which is a down side when working with tools that run in the background and where you now need to build in extra functionality to support this. 

Another downside of this approach is the need of having this authentication information stored inside your tool or configuration, which introduces a potential security risk.

To solve that issue, Nuage offers the capability of certificate based authentication in its API and VSPKs. 

# Certificate based authentication
When using certificate based authentication, instead of providing a username, password and enterprise, you will only need to provide a certificate and a key. This way, you do not have to store plain text user information.

## Setting up certificate based authentication
To use certificate based authentication, the first step to take is to create a user in the Nuage VSD which will be used for the certificate based authentication. This user can be for the global CSP enterprise, or for a specific organization/enterprise.

Make sure the user is part of the correct groups, so it can do the actions your tool or script will need to do.

Once a user has been created, the certificate and key for this user is generated on one of the VSD servers. The following command can be used for this functionality:

{% highlight shell %}
/opt/vsd/ejbca/deploy/certMgmt.sh -a generate -u <VSD Username> -c <VSD Username> -o <VSD Enterprise> -f pem -t client
{% endhighlight %}

For instance, if you want to create a certificate for a user called `pdellaert` in the CSP enterprise, you can do so with the following command:

{% highlight shell %}
/opt/vsd/ejbca/deploy/certMgmt.sh -a generate -u pdellaert -c pdellaert -o csp -f pem -t client
{% endhighlight %}

This command will generate a new certificate for the user and will enable the certificate based authentication for the user. The files generated can be located in `/opt/vsd/ejbca/p12/pem/`:

{% highlight shell %}
[root@vsd01 ~]# ll /opt/vsd/ejbca/p12/pem/pdellaert*
-rw-r--r--. 1 root root 1135 Apr 14 13:25 /opt/vsd/ejbca/p12/pem/pdellaert-CA.pem
-rw-r--r--. 1 root root 4543 Apr 14 13:25 /opt/vsd/ejbca/p12/pem/pdellaertCert.pem
-rw-r--r--. 1 root root 1703 Apr 14 13:25 /opt/vsd/ejbca/p12/pem/pdellaert-Key.pem
-rw-r--r--. 1 root root 1488 Apr 14 13:25 /opt/vsd/ejbca/p12/pem/pdellaert.pem
{% endhighlight %}

From this list, copy the last two files (in the example `pdellaert-Key.pem` and `pdellaert.pem`) to the system on which your tool or script will be running. 

## Using certificate based authentication
To use certificate based authentication, your tool or script will have to connect to the VSD using a different port, *7443* instead of 8443. This is where the certificate based authentication service runs.

Below are examples of setting up a session using certificate based authentication using the Python and Go VSPKs. 

### Python VSPK

{% highlight python %}
from vspk import v4_0 as vsdk

nuage_session = vsdk.NUVSDSession(username='pdellaert', enterprise='csp', api_url='https://localhost:7443', certificate=('/Users/pdellaert/.nuage/pdellaert.pem', '/Users/pdellaert/.nuage/pdellaert-Key.pem'))
nuage_session.start()
{% endhighlight %}

### Go VSPK

{% highlight go %}
import (
    "fmt"
    "tls"

    "github.com/nuagenetworks/vspk-go/vspk"
)

if cert, err := tls.LoadX509KeyPair("/Users/pdellaer/.nuage/pdellaert.pem", "/Users/pdellaer/.nuage/pdellaert-Key.pem"); err != nil {
    fmt.Printf("Loading TLS certificate and private key failed: ")
    return "", err
} else {
    mysession, root = vspk.NewX509Session(&cert, "http://localhost:7443")
}
{% endhighlight %}

