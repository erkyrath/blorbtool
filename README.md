# BlorbTool: Interactive in-browser Blorb editing

- Designed by Andrew Plotkin <erkyrath@eblong.com>

BlorbTool allows you to view and edit blorb files in your browser.

Blorb is a game packaging format used by many modern interactive fiction tools. A blorb file wraps up a game, its assets, cover art, and bibliographic information in a single file that can be downloaded and played.

Inform 7 generates blorb files as a matter of course. But if you're using Inform 6 or other systems, you might want to use BlorbTool to package your game. Or you can just explore a blorb file to find out more about it!

For more information, see the [Blorb web site][blorb].

[blorb]: https://eblong.com/zarf/blorb/

## To use BlorbTool

To see BlorbTool in action, visit [this demo page][btsensory].

To use BlorbTool on your own file, [go to this page][btloader] and select "Choose File".

[btsensory]: https://eblong.com/zarf/blorb/blorbtool/run-sensory.html
[btloader]: https://eblong.com/zarf/blorb/blorbtool/run.html

Note BlorbTool runs entirely in your browser. The file you select is *not* uploaded to any server. If you close or reload your browser window, the displayed file will be lost.

## What is this for?

There are many command-line Blorb editors out there. (I recommend my own [blorbtool.py][], a Python script.) But not everybody likes command-line tools. So here's a (simple) GUI editor.

[blorbtool.py]: https://eblong.com/zarf/blorb/blorbtool.py

Also, I figured this would make a good React test project. Turns out React looks great on your resume.

### Why purple ribbons?

Gosh, I've built so many web pages out of [blue][blog] and [beige][photos] rectangles. I wanted to bling this one out... just a tiny bit.

[blog]: https://blog.zarfhome.com
[photos]: https://eblong.com/zarf/photo/

## Building BlorbTool

BlorbTool comes with its Javascript library built and ready to go. But if you want to mess with the source code, you can.

BlorbTool uses three tools from the Javascript ecosystem:

- [React][], a library for making single-page web apps
- [Typescript][], a strongly-typed variant of Javascript
- [Rollup][], a tool for packaging Javascript (and Typescript) in an easily-loadable (and minified) form

[React]: https://react.dev
[Typescript]: https://www.typescriptlang.org
[Rollup]: https://rollupjs.org

Only React is part of the final runnable app. Typescript and Rollup are used only in the build process.

Thanks to copious config files, the process of building is very simple. Just type:

```
npm install
npm run build
```


