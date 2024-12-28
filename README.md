## workflow

1. run `nr build:copy` to get the dom collection script copied to clipboard
2. paste in console of any website and interact with something
   - note, if the website does not use react-scan's react-component-name plugin the results will likely be useless. Sentry's website works okay since they tag components with data attributes with the component names and some components have display names
   - Here is a website that does use the plugin https://tracing.cse.buffalo.edu/student/tracing/practice
3. copy output json
4. paste into a test file
5. import test file and use in make-prompt.ts
6. run `nr prompt:copy` to get the generated prompt pasted to console
7. paste into the chatui of any model provider
