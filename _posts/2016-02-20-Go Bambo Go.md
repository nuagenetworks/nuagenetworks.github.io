---
layout: post
title: Go Bambou, Go!
author: Antoine Mercadal
callout_image: posts/header-go-bambou-go.png
---

[Go](https://goland.org) is a rising language that has a concurrency system built-in the syntax itself, produces very portable binaries, and compiles very fast. It makes a perfect sense to use in the context of system and server programing.

At Nuage Networks, we’ve released the `vspk` a while back. It is Python based auto generated framework that allows the users to interact with our VSD apis in a very efficient way, by completely abstracting the ReST communication system.

The auto generated code, coming from [Monolithe](https://github.com/nuagenetworks/monolithe), relies on Bambou that provides all the needed communication interfaces and make the code generation easy and generic.

As I stated in a previous post, Monolithe is, in its core, a tool that takes some formatted api specifications (like the [VSD Specifications](https://github.com/nuagenetworks/vsd-api-specifications) used to generate the `vspk`), and outputs some code, based on Jinja templates.

We always had the plan to make Monolithe being able to generate SDKs in other language, as it was just a matter of rewiring some code so it could take a different set of templates. That is not the big part. The big part is to port the Bambou library in a different langage.

Bambou is coming from our internal UI Cappuccino Framework, RESTCappuccino. Cappuccino is an Object Oriented language, as well as Python, so the port was fairly easy. But when it comes to Go, it’s a bit different. Go is OO language in some extends, but doesn’t have inheritance, subtyping and things like that. Plus I never wrote a single line of Go. So I had to adapt, and learn a lot of things. And what’s a better way to learn than having a real project to work on?

So I started working on porting Bambou to Go, and I came from being lost, to rage quitting, to coming back and trying harder to finally falling in love with Go.

Today, I’m glad to announce that [Go-Bambou is available on GitHub](https://github.com/nuagenetworks/go-bambou).

But as Bambou, Go-Bambou by itself doesn’t do much. So we’ve also pushed an update to Monolithe to make it able to generate the Go version of the `vspk`.

# Let’s start!

## Install Tools

As a reminder, let’s install the needed stuff in a virtual env (I’m using [`virtualenvwrapper`](http://virtualenvwrapper.readthedocs.org/en/latest/), and I suggest you do so):

    $ mkvirtualenv mono
    (mono)$ pip install git+https://github.com/nuagenetworks/monolithe.git
    (mono)$ pip install git+https://github.com/nuagenetworks/vspkgenerator.git

Let's create a little rc file that will avoid having to type to many options:

    (mono)$ cat > monorc << eof
    export MONOLITHE_GITHUB_API_URL=https://api.github.com
    export MONOLITHE_GITHUB_ORGANIZATION=nuagenetworks
    export MONOLITHE_GITHUB_REPOSITORY=vsd-api-specifications
    eof
    (mono)$ source monorc

## Generate the Go vspk

Now you can generate the Go source code of the `vspk`:

    (mono)$ generate-vspk -b master --language go
    [log] retrieving specifications from github "nuagenetworks/vsd-api-specifications@master"
    [log] 130 specifications retrieved from branch "master" (api version: 3.2)
    [log] assembling all packages...
    [success] vspk generation complete and available in "./codegen/go"

And voila! You can check in the `codegen/go` directory to see the sources.

## Prepare your Go workspace

Of course, you need [Go installed](https://golang.org/dl/) on your system and Go workspace.

If you are not familliar with Go, you should take a look at [this video](https://www.youtube.com/watch?v=XCsL89YtqCs) to understand workspaces a bit more in detail.

If you are familliar, you certainly have a workspace already in place.

    $ export GOPATH=`pwd`
    $ go get github.com/nuagenetworks/go-bambou/bambou

## Install Go-Bambou and the vspk

Now copy or move the generated Monolithe source code in your workspace:

    $ mkdir -p src/github.com/nuagenetworks/
    $ mv codegen/go src/github.com/nuagenetworks/go-vspk
    $ go install github.com/nuagenetworks/go-vspk/vspk

You can check your installation by doing:

    $ go list ./...
    ...
    github.com/nuagenetworks/go-bambou/bambou
    github.com/nuagenetworks/go-vspk/vspk
    ...

Cool! Now, you have Go-Bambou and the vspk installed in your environment. You are ready to "Go"!


# Code!

Now we have everything generated and installed, how about trying it?

For the following example you need to have a VSD server installed. But remember, nothing prevent you to create your own api server, and generate a Go sdk according to a different set of specifications. We may even help you soon about that ;)

First, create a new package:

    $ mkdir -p src/github.com/primalmotion/vspk-example
    $ cd src/github.com/primalmotion/vspk-example
    $ touch vspk-example.go

Let's write a basic program that can open a new session:

{% highlight go %}
    package main

    import (
    	"fmt"
    	"github.com/nuagenetworks/go-vspk/vspk"
    )

    func main() {

    	session, root := vspk.NewSession("csproot", "csproot", "csp",
            "https://api.nuagenetworks.net:8443")

    	session.Start()
    	fmt.Println("APIKey:", root.APIKey)
    }
{% endhighlight %}

This is a very simple program that will start a session on a VSD, and print the API Key returned by the server. To build and run it, do:

    $ go build && ./vspk-example
    APIKey: f7598dbf-08dd-40af-96dd-94d364c29eda

That was easy. Now let's the enterprise named `Triple A`. Modify the code so it looks like:

{% highlight go %}
    package main

    import (
    	"fmt"
    	"github.com/nuagenetworks/go-bambou/bambou"
    	"github.com/nuagenetworks/go-vspk/vspk"
    )

    func main() {

    	session, root := vspk.NewSession("csproot", "csproot", "csp",
            "https://api.nuagenetworks.net:8443")

    	session.Start()

    	f := &bambou.FetchingInfo{Filter: "name == \"Triple A\""}
    	enterprises, err := root.Enterprises(f)

    	if err != nil {
    		panic("error: " + err.Error())
    	}

    	fmt.Printf("%d enterprise! ID: %s\n",
            f.TotalCount, enterprises[0].ID)
    }
{% endhighlight %}

This time, we are using a filter. Filter and other information like paginaltion are given through the `bambou.FetchingInfo` object. It will be used to forge the request, and will be populated back when the request is complete, so you can see the total number of entities and other informations. You'll also notice that `root.Enterprises()` returns an Error in addition to the list. If this error is not nil, then something bad happened.

Run it and you'll see:

    $ go build && ./vspk-example
    1 enterprise found! ID: 4b6b5c3f-304e-4f06-8dbc-811767b1be27

Now, let's create a User in that enterprise in that enterprise:

{% highlight go %}
    package main

    import (
    	"fmt"
    	"github.com/nuagenetworks/go-bambou/bambou"
    	"github.com/nuagenetworks/go-vspk/vspk"
    )

    func main() {

    	session, root := vspk.NewSession("csproot", "csproot", "csp",
            "https://api.nuagenetworks.net:8443")

    	session.Start()

    	f := &bambou.FetchingInfo{Filter: "name == \"Triple A\""}
    	enterprises, err := root.Enterprises(f)

    	if err != nil {
    		panic("error: " + err.Error())
    	}

    	e := enterprises[0]

    	u := vspk.NewUser()
    	u.FirstName = "Antoine"
    	u.LastName = "Mercadal"
    	u.UserName = "primalmotion"
    	u.Email = "primalmotion@nuagenetworks.net"
    	u.Password = "c8fed00eb2e87f1cee8e90ebbe870c190ac3848c"
    	err = e.CreateUser(u)

    	if err != nil {
    		panic("error: " + err.Error())
    	}

    	fmt.Println("User created! ID:", e.ID)

    	u.Delete()
    }
{% endhighlight %}

This is again straightforward. We create a new `vspk.User` using `vspk.NewUser()`, then we set some attributes, and we create it under the enterprise using `e.CreateUser()`. The user will be created, his `ID` will be printed, and we delete it (so we can rerun the program without conflicts) using `u.Delete()`.

Again, run it and you'll see:

    $ go build && ./vspk-example
    User created! ID: 4b6b5c3f-304e-4f06-8dbc-811767b1be27

Now let's see how to assign it to a group:

{% highlight go %}
    package main

    import (
    	"fmt"
    	"github.com/nuagenetworks/go-bambou/bambou"
    	"github.com/nuagenetworks/go-vspk/vspk"
    )

    func main() {

    	session, root := vspk.NewSession("csproot", "csproot", "csp",
            "https://api.nuagenetworks.net:8443")

    	session.Start()

    	f := &bambou.FetchingInfo{Filter: "name == \"Triple A\""}
    	enterprises, err := root.Enterprises(f)

    	if err != nil {
    		panic("error: " + err.Error())
    	}

    	e := enterprises[0]

    	u := vspk.NewUser()
    	u.FirstName = "Antoine"
    	u.LastName = "Mercadal"
    	u.UserName = "primalmotion"
    	u.Email = "primalmotion@nuagenetworks.net"
    	u.Password = "c8fed00eb2e87f1cee8e90ebbe870c190ac3848c"
    	err = e.CreateUser(u)

    	if err != nil {
    		panic("error: " + err.Error())
    	}

    	fmt.Println("User created! ID:", e.ID)

    	g := vspk.NewGroup()
    	g.Name = "Go Users"
    	g.Description = "A group for people"
    	e.CreateGroup(g)

    	if err != nil {
    		panic(err.Error())
    	}

    	fmt.Println("Group created! ID:", u.ID)

    	g.Description = "A group for hipster people"
    	g.Save()

    	fmt.Println("Group updated!")

    	assignationList := vspk.UsersList{u}
    	err = g.AssignUsers(assignationList)

    	if err != nil {
    		panic(err.Error())
    	}

    	contents, _ := g.Users(nil)
    	fmt.Printf("User assigned! Group content: %s\n", contents)

    	u.Delete()
    	g.Delete()
    }
{% endhighlight %}

Here we create a group, we update it with the `g.Update()` (so you can see this method), then we use the `g.AssignUsers()` to assign a list of Users. Finally we clean up everything.

Run it and you'll see:

    $ go build && ./vspk-example
    User created! ID: 4b6b5c3f-304e-4f06-8dbc-811767b1be27
    Group created! ID: cca2d663-0c44-45f5-a291-78b82b54f9d3
    Group updated!
    User assigned! Group content: [<user:cca2d663-0c44-45f5-a291-78b82b54f9d3>]

This covers the basic of the CRUD operations. The last thing I want to show you is how to use the `PushCenter`. Let's modify the code a bit so it looks like:

{% highlight go %}
    package main

    import (
    	"fmt"
    	"github.com/nuagenetworks/go-bambou/bambou"
    	"github.com/nuagenetworks/go-vspk/vspk"
    	"time"
    )

    func main() {

    	session, root := vspk.NewSession("csproot", "csproot", "csp",
            "https://api.nuagenetworks.net:8443")

    	session.Start()

    	pushCenter := bambou.NewPushCenter()

    	pushCenter.StartWithHandler(func(n *bambou.Notification) {

    		for _, e := range n.Events {
                fmt.Printf("New Event! %s on %s: %s\n",
                        e.Type, e.Entities[0]["ID"],
                        e.EntityType)
    		}
    	})

    	f := &bambou.FetchingInfo{Filter: "name == \"Triple A\""}
    	enterprises, err := root.Enterprises(f)

    	if err != nil {
    		panic("error: " + err.Error())
    	}

    	e := enterprises[0]

    	u := vspk.NewUser()
    	u.FirstName = "Antoine"
    	u.LastName = "Mercadal"
    	u.UserName = "primalmotion"
    	u.Email = "primalmotion@nuagenetworks.net"
    	u.Password = "c8fed00eb2e87f1cee8e90ebbe870c190ac3848c"
    	err = e.CreateUser(u)

    	if err != nil {
    		panic("error: " + err.Error())
    	}

    	g := vspk.NewGroup()
    	g.Name = "Go Users"
    	g.Description = "A group for people"
    	e.CreateGroup(g)

    	if err != nil {
    		panic(err.Error())
    	}

    	g.Description = "A group for hipster people"
    	g.Save()

    	assignationList := vspk.UsersList{u}
    	err = g.AssignUsers(assignationList)

    	if err != nil {
    		panic(err.Error())
    	}

    	u.Delete()
    	g.Delete()

        // gives a few seconds so we can see all the pushes
    	time.Sleep(2 * time.Second)

    	pushCenter.Stop()
    }
{% endhighlight %}

So here, we create a PushCenter and we give it a handler function. Everytime a event occurs on the system, the PushCenter will call this handler method, passing it the notification. You can see that we've removed all the prints. We also add a little dirty `Sleep` at the end so we are sure we will receive all the events before the program terminates.

Once more, run it and you'll see:

    $ go build && ./vspk-example
    New Event! CREATE on 06a274f5-7d05-4625-bffb-e47835fc0721: user
    New Event! CREATE on 6d428c5b-f506-4af3-954f-28ec86163d32: group
    New Event! UPDATE on 6d428c5b-f506-4af3-954f-28ec86163d32: group
    New Event! UPDATE on 6d428c5b-f506-4af3-954f-28ec86163d32: group
    New Event! DELETE on 06a274f5-7d05-4625-bffb-e47835fc0721: user
    New Event! DELETE on 6d428c5b-f506-4af3-954f-28ec86163d32: group

# Last words

As you can see, it it really easy to use, and also very familliar if you have used the Python version of the `vspk`. Now with the power of Go, you can of course run all the calls in Go Routines and do a lot of concurent operations.

I hope you'll enjoy this, and I wish you a very happy coding!