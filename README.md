# Git Gallery

Git Gallery is tool for creating a visual gallery from Git commits. It's originally intended for those creating visual art with code, but it will work in any situation where you want to associate images with commits outside the repository. The result is a visual record of the commit history that can then be displayed on any webserver.

To add images for a commit you first create a 'page' for that commit. The page lives in a directory on the filesystem named after the commit id. The directory contains the images and a 'page.json' file with additional metadata (title, comments, etc.). The web interface makes it easy to create and edit pages, so most of the time you won't need to touch the filesystem.

The motivation for creating Git Gallery comes from creating algorithmic art. In the process of creation a work can go through many iterations that are worth preserving. Sometimes new ideas and directions to explore emerge that one wishes to follow up on later. The Git approach to this workflow is to commit interesting versions and create branches for new ideas to work on them in parallel. Unfortunately, most Git tools present interfaces with a more singular software development model in mind, where branches mostly exist to be merged into master and older commits are quickly buried. Git Gallery is intended to make it easy to keep track of versions of a work, relate them back to their Git commits and to publish them onto the web for others to view.

## Features

* Create gallery pages for any Git commit
* Edit the page in the browser
* Drag-n-drop images onto the page to have them included
* View and commit your current working copy at `/current.html`
* Maintains a HEAD directory that points to the current Git HEAD
* View the current HEAD commit at `/HEAD`
* Read files directly from the repo: You can reference files in a given commit at /pages/:commitId:/repo/filename. This is especially useful if your content can display in a web browser, since you can then have it run live on the page
* Thumbnails are generated on the fly and cached for reuse. You can request a thumbnail of any image by appending the query `thumb=200x200` to the request (or whatever resolution you desire). You can also request the first image of a page as a thumbnail at `{{commitId}}/thumbnail?thumb=200x200`. The thumbnail will retain the orginal aspect ratio while fitting within the given dimensions
* Export the gallery into a standalone directory structure that can be copied to a simple web server for others to view.

## Usage

On Windows you need to run all commands as Administrator.

```
npm install -g git-gallery
```

Then cd to the directory containinng your Git repo and initialize the gallery:
```
git-gallery init
```
This will create the .gitGallery directory.

Then run the app:
```
git-gallery
```

Git Gallery will create a .gitGallery directory containing all its files. Every time you create a page it will create a sub-directory named after the commit id to store images and info about that page. The app is an Express webserver that will serve content from this directory and from the underlying Git repository

Open a web browser and navigate to http://localhost:3000/ to view the gallery (initially empty). From there you can navigate to /HEAD/ to see your current HEAD commit, and to /current/ to see your current working directory.

Information about the page is stored in the page.json file in each commit directory. You can edit this in the browser or by hand.

The HEAD directory is a symbolic link that will always point to the commit directory of the current HEAD commit (note you still need to create a page for that commit for the link to be valid). In this way you can programmatically save images/content to the HEAD directory and it will go to the correct place.

Your current working directory is visible at `/current/`. From here you can see your current branch and any modifications, and create a new commit ('git add *; git commit'). If your work runs in a browser you can view it live on the page enabling a single place to view, test and commit from.

For web projects that draw to an HTML canvas, I've created a snippet of code that you can use to view the project live in the browser and take snapshots that are saved to the page. You can enable this by editing the `showCanvas` setting in the galleryData.json file.

You can export pages into a standalone directory structure that can be copied to a web server. When exporting you have the option of whether to include the repository contents, the live canvas and images for the pages. An example of an exported gallery can be seen [here](https://briancort.com/gitGallerySample/index.html).

## Status

Git-Gallery should be considered beta quality at this point. Please send feedback, suggestions and pull-requests.

## Roadmap

Add a couple convenience Git methods:
* Checkout commits
* Create branches