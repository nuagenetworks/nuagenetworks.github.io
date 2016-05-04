---
layout: post
title: Hello, Monolithe!
author: Antoine Mercadal
callout_image: posts/header-monolithe.jpg
---

Monolithe is a Python library that generates SDKs, CLIs, and their documentation, and also ReST API Documentation, all from a single set of JSON specifications.

Today, we are very excited to announce the release of [Monolithe on GitHub](https://github.com/nuagenetworks/monolithe)!

<figure><center><img width="40%" src="{{site.baseurl}}/img/posts/monolithe-logo.png" alt="logo"></center></figure>

## Background Story

In the UX team, we are mostly lazy people. But we’re the good kind of lazy. The kind who are willing to work hard, but only once on the same thing. When we came up with the idea of creating a full blown Python SDK for VSP a long while ago, we already knew that trying to manually support the source code for over 130 (and growing) different objects would have been a real pain. Also, we didn’t want just to provide a simple wrapper over curl (not aiming at anyone).

## Bambou

Instead, we worked on [Bambou](https://github.com/nuagenetworks/bambou), which is a low level set of objects that handles all the basic communications for you. If you have ever tried `vspk`, you certainly noticed that you never deal directly with URI or json data. You deal with high level concepts, like a session, a model, a push center and so on. You can thank Bambou for that.

This idea was not new as we created all the concepts you can find in Bambou in one of our internal [Cappuccino](http://cappuccino-project.org) framework for VSD Architect. Bambou is a simple port of those concepts, from Cappuccino to Python.

But Bambou is abstract. It doesn’t know what is a domain or a gateway. It deals with ReST objects, resource identifiers, fetchers, etc. It’s still better that curl, but better is not enough. We needed a way to create subclasses, each of them representing one of the VSD object exposed through the ReST api.

So we’ve started working on Monolithe.

## Monolithe

Monolithe is the tool we developed to generate the `vspk`. It basically takes a set of API Specifications as input, and creates a `vspk`, its documentation, the related `vsd` cli and the VSD API documentation (while we’re at it) as output.

We could have stopped here, but we like generic and agnostic things. Generating a ReST framework is obvisouly not something unique to VSD or Nuage. So instead of making Monolithe only able to generate the `vspk`, we made it able to generate **any** SDK. Everything is configurable. The name, some key class names, your api prefix, api versions, custom license and headers, and even custom code that you can add in a very elegant fashion using the overriding system.

In a nutshell, you write some specifications, you inject them into Monolithe, you get a ready-to-use SDK and you can go grab a coffee and enjoy your life.

We just happen to use Monolithe to create our `vspk` and not only you can help us improving it, but you can also use it to create your own SDKs for your own projects.

There is a simple tutorial in the [README file](https://github.com/nuagenetworks/monolithe/blob/master/README.md) that will get you started and will explain how to create a ready to use SDK for a simple Todo List Server.

## vspkgenerator

We wanted you to be able to generate your own SDK, but also a version of the `vspk` itself. That's why we are also releasing the [`vspkgenerator`](https://github.com/nuagenetworks/vspkgenerator). It's a simple project using Monolithe, that contains the configuration and vanilla files needed to create the `vspk` (and so the VSD API documentation, the `vsd` cli and so on.) This repository is a good example of how to use Monolithe in a real life scenario.

But `vspkgenerator` is not enough. You also need the JSON specification of our VSD API. We are also happy to announce that they are [available on GitHub too](https://github.com/nuagenetworks/vsd-api-specifications).

I'm pretty sure you'd like to see how to generate a `vspk`. There you go:

    $ generate-vspk --branches 3.2
    > Enter your GitHub login: primalmotion
    > Enter your GitHub password for primalmotion: <top-secret>
    > [success] Generation complete and available at "./codegen"

Should you need the api documentation:

    $ generate-vsd-apidoc --branches 3.2
    > Enter your GitHub login: primalmotion
    > Enter your GitHub password for primalmotion: <top-secret>
    > [success] Generation complete and available at "./apidocgen"

And that's it! The freshly cooked `vspk` is available in the `codegen` folder and the VSD API Documentation is available in the `apidocgen` folder.

Of course, there's a lot of additional options. Just take a look at the `--help`.

## What’s next?

Now you have Specifications and a SDK, wouldn’t it be nice to have a little bit more?

<figure><center><img width="30%" src="{{ site.baseurl }}/img/posts/we-have-a-plan.png" alt="image"></center></figure>

Stay tuned, because Monolithe is really just the beginning ;)
