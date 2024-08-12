function getNameBrowser() {
  return prompt("What is your name?");
}
export const fallbackName = "bundler";
export const name = getNameBrowser();
