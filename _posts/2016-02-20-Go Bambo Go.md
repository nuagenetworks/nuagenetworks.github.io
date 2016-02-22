---
layout: post
title: Go Bambou, Go!
author: Antoine Mercadal
callout_image: posts/header-go-bambou-go.png
---

[Go](https://goland.org) is a rising language that has a built-in concurrency system, produces very portable binaries, and compiles very fast. It makes perfect sense to use in the context of system and server programing.

At Nuage Networks, we’ve released the `vspk` a while back. It is a Python based auto generated framework that allows the users to interact with our VSD apis in a very efficient way, by completely abstracting the ReST communication system.

The auto generated code, coming from [Monolithe](https://github.com/nuagenetworks/monolithe), relies on [Bambou](https://github.com/nuagenetworks/bambou) which provides all the needed communication interfaces and make the code generation easy and generic.

As I stated in a previous post, Monolithe is, in its core, a tool that takes some formatted api specifications as input (like the [VSD Specifications](https://github.com/nuagenetworks/vsd-api-specifications) used to generate the `vspk`), and outputs some code, based on some Jinja templates.

We always had the plan to make Monolithe be able to generate SDKs in other languages, as it was just a matter of rewiring some code so it could use a different set of templates. That's not the big part. The big part is to port the Bambou library in a different langage.

Bambou is coming from our internal UI Cappuccino Framework, RESTCappuccino. Cappuccino is an Object Oriented language, as well as Python, so the port was fairly easy. But when it comes to Go, it’s a bit different. Go is also an OO language to some extent, but doesn’t have inheritance, subtyping and things like that. Plus, I never wrote a single line of Go. So I had to adapt and learn a lot of things. And what’s a better way to learn than a real world project to work on?

So I started porting Bambou to Go, and I came from being lost, rage quitting, coming back and trying harder to finally falling in love with Go. It's a very good language, and I was able to make something really simple and beautiful.

> Today, I’m glad to announce that [Go-Bambou is available on GitHub](https://github.com/nuagenetworks/go-bambou)!

But as the Python Bambou, Go-Bambou by itself doesn’t do much. So we’ve also pushed an update to Monolithe to make it able to generate the Go version of the `vspk`. In this post I will show you the entire installation and a real world example.

# Let’s Get Started!

## Install Tools

As a reminder, let’s install the needed stuff in a virtual env (I’m using [`virtualenvwrapper`](http://virtualenvwrapper.readthedocs.org/en/latest/), and I suggest you do so):

    $ mkvirtualenv mono
    (mono)$ pip install git+https://github.com/nuagenetworks/monolithe.git
    (mono)$ pip install git+https://github.com/nuagenetworks/vspkgenerator.git

Let's create a little rc file that will avoid having to type too many options:

    (mono)$ cat > monorc << eof
    export MONOLITHE_GITHUB_API_URL=https://api.github.com
    export MONOLITHE_GITHUB_ORGANIZATION=nuagenetworks
    export MONOLITHE_GITHUB_REPOSITORY=vsd-api-specifications
    eof

Finally, source that file:

    (mono)$ source monorc

## Generate the Go VSPK

You can now generate the Go source code of the `vspk`:

    (mono)$ generate-vspk -b master --language go
    [log] retrieving specifications from github "nuagenetworks/vsd-api-specifications@master"
    [log] 130 specifications retrieved from branch "master" (api version: 3.2)
    [log] assembling all packages...
    [success] vspk generation complete and available in "./codegen/go"

Voilà! You can check the `codegen/go` directory to see the generated source code.

## Prepare your Go Workspace

Of course, you need to have [Go installed](https://golang.org/dl/) on your system and Go workspace.

If you are not familiar with Go, you should take a look at [this video](https://www.youtube.com/watch?v=XCsL89YtqCs) to understand workspaces a bit more in detail.

Declare the `GOPATH`:

    $ export GOPATH=`pwd`

## Install Go-Bambou and the Go VSPK

First, install the Go-Bambou package:

    $ go get github.com/nuagenetworks/go-bambou/bambou

Now copy or move the generated source code into your workspace:

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

We have everything generated and installed, so how about trying it?

For the following example you'll need to have a VSD server installed. But remember, nothing prevents you to create your own api server, and to generate a Go SDK from a different set of specifications. We may even help you with that soon ;)

First, create a new package:

    $ mkdir -p src/github.com/primalmotion/vspk-example
    $ cd src/github.com/primalmotion/vspk-example
    $ touch vspk-example.go

Let's write a basic program that can open a new VSD session:

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

This is a very simple program that starts a session on a VSD, and prints the API Key returned by the server. To build and run it, do:

    $ go build && ./vspk-example
    APIKey: f7598dbf-08dd-40af-96dd-94d364c29eda

That was easy. Now let's retrieve the enterprise named `Triple A` (of course adapt the name to your own environment). Modify the code so it looks like:

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

As you can seem we use a filter. Filter and other information like pagination are given through the `bambou.FetchingInfo` structure. It will be used by Bambou to forge the request, and will be populated back when the request is complete with additional information, so you can see the total number of entities and other things like that. You'll also notice that `root.Enterprises()` returns an `*Error` in addition to the list. If this error is not nil, then something wrong happened.

Run it and you'll see:

    $ go build && ./vspk-example
    1 enterprise found! ID: 4b6b5c3f-304e-4f06-8dbc-811767b1be27

Now, let's create a User in that enterprise:

{% highlight go %}
    package main

    import (
    	"fmt"
    	"github.com/nuagenetworks/go-bambou/bambou"
    	"github.com/nuagenetworks/go-vspk/vspk"
    )

    func main() {

        // uncomment for debug logging
        // bambou.Logger().SetLevel(0)

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

This is again very straightforward. We create a new `vspk.User` using `vspk.NewUser()`, we set some attributes and we create it under the enterprise using `e.CreateUser()`. The user is created, its `ID` is printed, then we delete it, so we can run the program again without having any conflict, using `u.Delete()`. You can use `bambou.Logger().SetLevel()` function to set the log level of Bambou.

Again, run it and you'll see:

    $ go build && ./vspk-example
    User created! ID: 4b6b5c3f-304e-4f06-8dbc-811767b1be27

Now let's see how to assign this user to a group:

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

Here we create a group, we update it with the `g.Update()` method (just for fun), then we use the `g.AssignUsers()` to assign a list of Users. Finally we clean up everything.

Run it and you'll see:

    $ go build && ./vspk-example
    User created! ID: 4b6b5c3f-304e-4f06-8dbc-811767b1be27
    Group created! ID: cca2d663-0c44-45f5-a291-78b82b54f9d3
    Group updated!
    User assigned! Group content: [<user:cca2d663-0c44-45f5-a291-78b82b54f9d3>]

This covers the basic of the CRUD operations. The last thing I want to show you is how to use the `PushCenter`. Create another little project at the same level than `vspk-example` package:

    $ cd ../
    $ mkdir vspk-push-example
    $ touch vspk-push-example.go

Then edit the `vspk-push-example.go` file so it looks like:

{% highlight go %}
    package main

    import (
    	"bufio"
    	"encoding/json"
    	"fmt"
    	"os"

    	"github.com/nuagenetworks/go-bambou/bambou"
    	"github.com/nuagenetworks/go-vspk/vspk"
    )

    func main() {

    	session, _ := vspk.NewSession("csproot", "csproot",
    		"csp", "https://api.nuagenetworks.net:8443")

    	session.Start()

    	userEventHandler := func(e *bambou.Event) {

    		// we unmarshal the data into a new user
    		u := vspk.NewUser()
    		json.Unmarshal(e.Data, u)

    		fmt.Printf("[User   ] New Event! %s: %s\n",
    			e.Type, u.FirstName)
    	}

    	groupEventHandler := func(e *bambou.Event) {

    		// we unmarshal the data into a new group
    		g := vspk.NewGroup()
    		json.Unmarshal(e.Data, g)

    		fmt.Printf("[Group  ] New Event! %s: %s\n",
    			e.Type, g.Name)
    	}

    	pushCenter := bambou.NewPushCenter()
    	pushCenter.RegisterHandlerForIdentity(userEventHandler,
                vspk.UserIdentity)
    	pushCenter.RegisterHandlerForIdentity(groupEventHandler,
                vspk.GroupIdentity)
    	pushCenter.Start()

    	fmt.Println("Press any key to exit.")
    	scanner := bufio.NewScanner(os.Stdin)
    	scanner.Scan()

    	pushCenter.Stop()
    }

{% endhighlight %}

Here we create two functions: `userEventHandler := func(e *bambou.Event)` and `groupEventHandler := func(e *bambou.Event)`. Then we create a `bambou.PushCenter` and we register these two function using `RegisterHandlerForIdentity()` by giving the handler, and an Identity. When a push regarding an object with the matching Identity is received, the corresponding handler is called. In the handler, we unmarshal the data to the corresponding kind of object, and we print some info. If you want to create a handler for any kind of push, you can pass the `bambou.AllIdentity` to the `RegisterHandlerForIdentity()` function.

Build the `vspk-push-example` program and run it in another terminal. Then run the `vspk-example` program and you should see:

<figure><center><img width="90%" src="{{site_url}}/img/posts/go-bambou-push.gif" alt="vspk-push-example"></center></figure>

# Going Further

As you can see, it is really easy to use. If you are used to the Python version of the `vspk` it should feel very familiar. Now with the power of Go, you can of course run all the functions in Go Routines and do a lot of concurrent operations and other cool things. If you want to learn Go a bit more, I suggest the following readings:

* [The interactive tutorial](https://tour.golang.org)
* [The official documentation](https://golang.org/doc/)
* [Go by example](https://gobyexample.com)
* [50 Shades of Go](http://devs.cloudimmunity.com/gotchas-and-common-mistakes-in-go-golang/)

You can also check the Go-Bambou documentation here:

* [Bambou Documentation](https://godoc.org/github.com/nuagenetworks/go-bambou/bambou).

I hope you'll enjoy this, and I wish you a very happy coding!