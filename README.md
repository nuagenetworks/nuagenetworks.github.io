# Nuage Networks Open Source Community Portal

http://nuagenetworks.github.io/

This is the repo for snippets, documentation and information around our open source projects.


# Write your own post

To write your own post, follow these steps:

1. Fork this repository to your github account
2. Perform a clone on your local PC

```
    git clone https://github.com/<githubhandle>/nuagenetworks.github.io.git 
```
3. Change to the directory you cloned the repo into

4. Create/Edit your post. Basically the structure we'd like to follow:
   
    - place posts in the `_posts` directory
    - place associated images in the `_img\posts\<post-name>\` directory

5. Commit the change
```
    $ git commit -am "New post about something cool"
```
6. Push the changes into your fork
```
    $ git push origin master
```
7. Do a Pull Request from your Github account


You may want to use a separate branch for your new post to keep your _master_ branch separated and in line with the main github repo.


# Setting up your GitHub Pages site locally with Jekyll

You can set up a local version of your Jekyll GitHub Pages site to test changes to your site locally. We recommend installing Jekyll to preview your post and help troubleshoot failed Jekyll builds or work out layout issues. 

Before installing Jekyll, make sure to install the necessary Ruby and devel packages. On a Centos 7 machine, this can be accomplished by

    $ yum install ruby ruby-devel zlib zlib-devel bundler

The actuall install of Jekyll relies on the `Gemfile` located in the root directory of this repository. This is done through

    $ bundle install

Finally the site can be build using

    $ bundle exec jekyll serve --detach --host=0.0.0.0

After which you can browse the updated site via your browser.

A more detailed list of install instructions can be found on https://help.github.com/articles/setting-up-your-github-pages-site-locally-with-jekyll/.

