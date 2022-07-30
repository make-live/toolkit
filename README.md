# Make Live Toolkit

A Yarn workspace containing the different parts of the Make Live Toolkit that allows customers to create their own custom experiences.

## What is the Make Live Toolkit?

The Make Live Toolkit consists of three different npm modules that work together to allow customers to make a custom UI for the Make Live project.

### @make-live/toolkit

This the main toolkit module that allows a website to communicate with a Make Live project. It effectively allows the website to host the Make Live project and then send and recieve events.

### @make-live/toolkit-react

This allows a website built with React to more easily use the base `@make-live/toolkit` module. It means you can use hooks and components that are more idiomatic to React.

### @make-live/toolkit-dev

This is an additional module that can function as an easy way to test your project without having to deploy to [Make Live](https://make.live) and incur costs during development. It provides a custom implementation of [Epic Games' Signalling Server](https://github.com/EpicGames/PixelStreamingInfrastructure/tree/master/SignallingWebServer) along with a server that emulates the Make Live environment.
