---
trigger: always_on
---

# INFO ABOUT PROJECT

This is a obs remote controller, it uses the OBS websocket protocol to control the software.
We use JS and Electron to build the application.
We have a plugin system, the plugins are loaded from the plugins folder inside the "robs" folder, in the Roaming folder
Plugins are .js files that have the functions inside them
Pluginutils is a file that contains utilities for plugins
The UI has a dashboard that shows all the sources, a sidebar that has buttons hardcoded in, and buttons from plugins, we have a console in the bottom, a confg button to edit connection, and a debug menu that you can enter if you input the hotkey
Only sources with _ in the beggining show up in the dashboard
This is a proffesional Livestream operator tool
We use it remotely, connected to other OBS, so we keep in mind how we refresh the sources and the plugins, in a efficient way