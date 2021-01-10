# Benzene Bots 4384 Web Backend

This app runs the API for the website

It handles:
- reading, editing, and creating blog posts
- hosting images and album manifest for photo gallery
- login and user creation for frontend admin panel that handles the above

The app runs on `api.benzenebots.com` and the container will automatically update from this repository when you create push your commits. (github will send a web request to /restartapp and then the container restarts, pulls changes, builds the TS, and starts the app again)
