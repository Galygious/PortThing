# PortThing – Ultra-Fast Nmap Port Search

PortThing is a zero-dependency static web app that lets you search Nmap's `nmap-services` database lightning-fast.

## Features
* Instant search/filter by service name, port number, description
* Protocol filter (TCP/UDP/SCTP)
* Dark UI – gray background & blue accents
* Pure static HTML/JS – no build step

## Running locally
Just open `index.html` in your browser.  No server required.

## Deploying to GitHub Pages
1. Create a **public repository** (e.g. `PortThing`).
2. Push the project files:
   ```sh
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-user>/<repo>.git
   git push -u origin main
   ```
3. In the repo settings → *Pages*, choose **Deploy from branch → main / root** and save.
4. After a minute your site will be live at:
   ```
   https://<your-user>.github.io/<repo>/
   ```

### Why `.nojekyll`?
GitHub Pages processes sites with Jekyll by default, which ignores files/folders starting with an underscore. Adding an empty `.nojekyll` file disables that processing so every file (including `nmap-services`) is served unchanged.

## License
`nmap-services` is © Insecure.Com LLC and redistributed under the Nmap Public Source License. The rest of this project is released under the MIT License. 