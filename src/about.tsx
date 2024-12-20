import React from 'react';
import { useContext } from 'react';

import { ReactCtx } from './contexts';
import { EditButton } from './widgets';

/* The display pane for "About BlorbTool".
 */
export function AboutPane()
{
    let rctx = useContext(ReactCtx);

    let evhan_noop = function() {};
    
    return (
        <>
            <h3>What is this?</h3>
            <p>BlorbTool allows you to view and edit blorb files
                in your browser.</p>
            <p>Blorb is a game packaging format used by many modern
                interactive fiction tools. A blorb file wraps up a
                game, its assets, cover art, and bibliographic
                information in a single file that can be downloaded
                and played.</p>
            <p>Inform 7 generates blorb files as a matter of course.
                But if you're using Inform 6 or other systems, you might
                want to use BlorbTool to package your game. Or you can
                just explore a blorb file to find out more about it!</p>
            <p>For more information, see the{' '}
                <a target="_blank" href="https://eblong.com/zarf/blorb/">Blorb web site</a>
            .</p>
            <h3>What do I do?</h3>
            { (rctx.showloader ?
               <p>Hit &#x201C;Choose File&#x201D; and select a blorb file
                   (<code>.blb</code>, <code>.zblorb</code>,{' '}
               <code>.gblorb</code>, etc).</p>
               : null) }
            <p>A blorb file is a series of &#x201C;chunks&#x201D;, which
                will be listed on the left. Select one to display it
                on the right.</p>
            { (!rctx.showloader ?
               <p>You can add or delete chunks using the buttons.
                   You can edit some (not all) elements of chunks;
                   look for the{' '}
                   <EditButton func={ evhan_noop } />
                   {' '}button. When you are finished editing, hit
                   the "Export Blorb" button (on the left) to save the 
                   updated blorb as a file.</p>
               : null) }
            <p>Note BlorbTool runs entirely in your browser. The file
                you select is <em>not</em> uploaded to any server.
                If you close or reload your browser window, the displayed
                file will be lost.</p>
        </>
    );
}
