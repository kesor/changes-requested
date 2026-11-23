# The prompt

Built with Claude Code on Fable 5.2. This is the main prompt, verbatim, typos included:

> ## I wrote the topic into @./topic.md its "accessibility". I want a fun accessibility demo that would do something like a pull-request review thing that shows an example of how to review a piece of web UI and show visually how inaccessible it is.
>
> ## Since we have limited time, lets try and grab captures from popular websites, and the html demo would analyze the pages we grab, and show a walkthrough on those pages for anything that is bad accessibility.
>
> ## So for exapmle we grab a product description from amazon.com and then show highlights with next, next, next, wizard that show how that page is not great in terms of accessibility. And we should be able to do that with any website.
>
> ## We have chrome-devtools-mcp available, so we should be able to run and drive a chrome headed browser. We have Nix available, so we can start any browser we might need, or any other tool we need.

(One prompt, one paragraph. It is split into four blocks here only so it can be read from the back of the room.)

## All prompts, in order

**Prompt 1** (before the topic was known to the model)

> Lets clone this repo and figure out what should the prompt be to make a cool demo for today's hackathon https://github.com/natsh/fable-5-2-build-day

**Prompt 2** (the main one, shown above, here as the single paragraph it was typed as)

> I wrote the topic into @./topic.md its "accessibility". I want a fun accessibility demo that would do something like a pull-request review thing that shows an example of how to review a piece of web UI and show visually how inaccessible it is. Since we have limited time, lets try and grab captures from popular websites, and the html demo would analyze the pages we grab, and show a walkthrough on those pages for anything that is bad accessibility. So for exapmle we grab a product description from amazon.com and then show highlights with next, next, next, wizard that show how that page is not great in terms of accessibility. And we should be able to do that with any website. We have chrome-devtools-mcp available, so we should be able to run and drive a chrome headed browser. We have Nix available, so we can start any browser we might need, or any other tool we need.

## Follow-ups

**Follow-up 1** (paraphrased; the exact wording was not kept)

> Keep the browser open between captures instead of launching a fresh one each time.

**Follow-up 2** (verbatim)

> We probably need the demo to be some kind of a video or an animated thing that does a walkthrough on the results. And in a way that I could show it off in less than two minutes.

**Follow-up 3** (verbatim)

> And you should be using more subagents.
