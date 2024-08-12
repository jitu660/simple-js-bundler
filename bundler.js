const path = require("path");
const fs = require("fs");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const babel = require("@babel/core");
const beautify = require("js-beautify/js").js;

let ID = 0;
const ENTRY = "./example/entry.js";
function createAsset(filepath) {
  const content = fs.readFileSync(filepath, { encoding: "utf-8" });
  const ast = parser.parse(content, { sourceType: "module" });
  const dependencies = [];

  traverse(ast, {
    ImportDeclaration: ({ node }) => {
      dependencies.push(node.source.value);
    },
  });

  const { code } = babel.transformFromAst(ast, null, { presets: ["@babel/preset-env"] });

  return {
    id: ID++,
    filepath,
    dependencies,
    code,
  };
}

function createGraph(entry) {
  const mainAsset = createAsset(entry);

  const assetQueue = [mainAsset];

  for (const asset of assetQueue) {
    //loop till we run out of dependency assets and add them in the queue
    const dirName = path.dirname(asset.filepath);
    asset.mapping = {};
    for (const relativepath of asset.dependencies) {
      const absolutePath = path.join(dirName, relativepath);
      const childAsset = createAsset(absolutePath);
      asset.mapping[relativepath] = childAsset.id;
      assetQueue.push(childAsset);
    }
  }

  return assetQueue; //this will be our graph
}

function bundle(graph) {
  let modules = "";

  for (const module of graph) {
    modules += `${module.id} : [
      function(require, exports) {
        ${module.code}
      },
      ${JSON.stringify(module.mapping)}
    ],`;
  }

  //IIFE which will be invoked with our modules object 
  const res = `
    (function(modules) {
      function require(id) {
        //get the function and mapping for module
        const [fn, mapping] = modules[id];

        const localRequire = (relativePath) => require(mapping[relativePath]); //local require to find the module using import statement
        // const module = {exports: {} };
        const exports = {};
        fn(localRequire, exports);

        return exports;
      }

      //start from entry => id = 0
      require(0);
    }({${modules}}))
  `;
  return res;
}
const graph = createGraph(ENTRY);
const bundled = bundle(graph);

//write the bundled code to dist/main.js
const filePath = path.join(__dirname, "dist", "main.js");
const dirPath = path.dirname(filePath);
if (!fs.existsSync(dirPath)) {
  //create dist if it does not exist
  fs.mkdirSync(dirPath);
}

if (fs.existsSync(filePath)) {
  //delete if main.js already exists
  fs.unlinkSync(filePath);
}

fs.writeFileSync(filePath, beautify(bundled, { indent_size: 2, space_in_empty_paren: true }), "utf-8");
console.log("Written bundled code to dist/main.js")
