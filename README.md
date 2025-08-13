<h2 align="center">
 <br>
 <img src="docs/thumbnail.png" alt="Groq Code CLI" width="400">
 <br>
 <br>
 Groq Code CLI: A highly customizable, lightweight, and open-source coding CLI powered by Groq for instant iteration.
 <br>
</h2>

<p align="center">
 <a href="https://github.com/build-with-groq/groq-code-cli/stargazers"><img src="https://img.shields.io/github/stars/build-with-groq/groq-code-cli"></a>
 <a href="https://github.com/build-with-groq/groq-code-cli/blob/main/LICENSE">
 <img src="https://img.shields.io/badge/License-MIT-green.svg">
 </a>
</p>

<p align="center">
 <a href="#Overview">Overview</a> •
 <a href="#Installation">Installation</a> •
 <a href="#Usage">Usage</a> •
 <a href="#Development">Development</a>
</p>

<br>

https://github.com/user-attachments/assets/5902fd07-1882-4ee7-825b-50d627f8c96a

<br>

# Overview

Coding CLIs are everywhere. The Groq Code CLI is different. It is a blueprint, a building block, for developers looking to leverage, customize, and extend a CLI to be entirely their own. Leading open-source CLIs are all fantastic, inspiring for the open-source community, and hugely rich in features. However, that's just it: they are *gigantic*. Feature-rich: yes, but local development with such a large and interwoven codebase is unfriendly and overwhelming. **This is a project for developers looking to dive in.**

Groq Code CLI is your chance to make a CLI truly your own. Equipped with all of the features, tools, commands, and UI/UX that’s familiar to your current favorite CLI, we make it simple to add new features you’ve always wanted. By massively cutting down on bloat and code mass without compromising on quality, you can jump into modifying this CLI however you see fit. By leveraging models on Groq, you can iterate even faster (`/models` to see available models). Simply activate the CLI by typing `groq` in your terminal. Use Groq Code CLI in any directory just like you would with any other coding CLI. Use it in this directory to have it build and customize itself!

A few customization ideas to get started:
- New slash commands (e.g. /mcp, /deadcode, /complexity, etc.)
- Additional tools (e.g. web search, merge conflict resolver, knowledge graph builder, etc.)
- Custom start-up ASCII art
- Change the start-up command
- Anything you can think of!


## Installation

### For Development (Recommended)
```bash
git clone https://github.com/build-with-groq/groq-code-cli.git
cd groq-code-cli
npm install

---

Para español, ver README_ES.md
