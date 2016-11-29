# Git Gallery

Git Gallery is tool for creating a visual gallery from Git commits. It's originally intended for those creating visual art with code, but it will work in any situation where you want to associate images with commits outside the repository. The result is a visual record of the commit history that can then be displayed on any webserver.

To add images for a commit you first create a 'page' for that commit. The page lives in a directory on the filesystem named after the commit id. The directory contains the images and a 'page.json' file with additional metadata (title, comments, etc.). The web interface makes it easy to create and edit pages, so most of the time you won't need to touch the filesystem.

The motivation for creating Git Gallery comes from my work creating algorithmic art. In the process of creation I often discover new ideas and directions that aren't what I was intending, but are worth exploring later. Similarly, even if the idea doesn't change, the appearance may go through many iterations that are worth preserving either for their own sake or as part of the creation process. Sometimes just changing a variable slightly or a sine wave to a square wave results in a totally different result and these explorations should also be recorded.

The Git approach to this workflow is to commit interesting versions and create branches for new ideas to work on them in parallel. Unfortunately, most Git tools are created with a more normal software development model in mind, where there is a single goal and branches exist to be merged into master. The only record of past work is terse commit messages and older commits quickly get lost. Git Gallery is intended to make it easy to keep track of all these versions of the work, relate them back to their Git commits and to publish them onto the web for others to view.

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

Your current working directory is visible at `/current/`. From here you can see your current branch and any modifications, and create a new commit ('git add *; git commit'). If your work runs in a browser you can view it live on the page enabling a single place to view, test and commit from.

For web projects that draw to an HTML canvas, I've created a snippet of code that you can use to view the project live in the browser and take snapshots that are saved to the page. You can enable this by uncommenting out the `{{> canvasPartial }}` line in pagePartial.hbs.

## Features

* Create gallery pages for any Git commit
* Edit the page in the browser
* Drag-n-drop images onto the page to have them included
* View and commit your current working copy at `/current.html`
* Maintains a HEAD directory that points to the current Git HEAD
* View the current HEAD commit at `/HEAD`
* Read files directly from the repo: You can reference files in a given commit at /pages/:commitId:/repo/filename. This is especially useful if your content can display in a web browser, since you can then have it run live on the page
* Thumbnails are generated on the fly and cached for reuse. You can request a thumbnail of any image by appending the query `thumb=200x200` to the request (or whatever resolution you desire). You can also request the first image of a page as a thumbnail at `{{commitId}}/thumbnail?thumb=200x200`. The thumbnail will retain the orginal aspect ratio while fitting within the given dimensions
* Export the gallery into a standalone directory structure that can be copied to a simple web server for others to view. You can optionally include the repository contents from the commit to enable viewers to run the code in their browsers.

