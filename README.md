# Git Gallery

Git Gallery is tool for creating a visual gallery from Git commits. It's primarily intended for those creating visual art with code.

Often when creating algorithmic art I discover versions of the work that aren't what I was intending, but are interesting in their own right. I might be inspired to go back later and explore from that point in a different direction. Other times I create something I like and then want to explore its parameter space. Simply changing a parameter from 3 to 5 or a sin wave to a square wave or just the colours will have a huge effect on the work. Git Gallery is intended to make it easy to keep track of these versions of the work, relate them back to their Git commits and (soon) to publish them onto the web.

## Status

Git-Gallery should be considered alpha quality at this point. Please send feedback, suggestions and pull-requests.

## Usage

On Windows you need to run all commands as Administrator.

```
npm install -g git-gallery
```

Then cd to the directory containinng your Git repo and run
```
git-gallery init
```
to create the .gitGallery directory.

Then run
```
git-gallery
```
to run the app.

Git Gallery will create a .gitGallery directory containing all its files. Every time you create a page it will create a sub-directory named after the commit id to store images and info about that page. The app is an Express webserver that will serve content from this directory and from the underlying Git repository

Open a web browser and navigate to http://localhost:3000/ to view the gallery (initially empty). From there you can navigate to /HEAD/ to see your current HEAD commit, and to /current/ to see your current working directory.

Information about the page is stored in the page.json file in each commit directory. You can edit this in the browser or by hand.

The HEAD directory is a symbolic link that will always point to the commit directory of the current HEAD commit (note you still need to create a page for that commit for the link to be valid). In this way you can programmatically save images/content to the HEAD directory and it will go to the correct place.

Your current working directory is available at `/current/`. From here you can see your current branch and changes and create a new commit ('git add *; git commit') If your work runs in a browser you can view it live on the page enabling a single place to view, test and commit from.

For web projects that draw to an HTML canvas, I've created a snippet of code that you can use to view the project live in the browser and take snapshots that are saved to the page. You can enable this by uncommenting out the `{{> canvasPartial }}` line in page.hbs.

## Features

* Create gallery pages for any Git commit
* Edit the page in the browser
* Drag-n-drop images onto the page to have them included
* View and commit your current working copy at `/current.html`
* Maintains a HEAD directory that points to the current Git HEAD
* View the current HEAD commit at `/HEAD`
* Read files directly from the repo: You can reference files in a given commit at /pages/:commitId:/repo/filename. This is especially useful if your content can display in a web browser, since you can then have it run live on the page
* Thumbnails are generated on the fly and cached for reuse. You can request a thumbnail of any image by appending the query `thumb=100x100` to the request (or whatever resolution you desire). You can also request the first image of a page as a thumbnail at `{{commitId}}/thumbnail?thumb=100x100`.

## Roadmap

Some planned features:
* Publish to the web: export the gallery in a simple format that can be copied to a basic web server
* Better configuration
* Improve the appearance
