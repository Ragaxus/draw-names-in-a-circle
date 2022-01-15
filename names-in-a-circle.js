const puppeteer = require('puppeteer');
const fs = require('fs');

const parseDataUrl = (dataUrl) => {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (matches.length !== 3) {
    throw new Error('Could not parse data URL.');
  }
  return {
    mime: matches[1],
    buffer: Buffer.from(matches[2], 'base64')
  };
};

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.addScriptTag({
    url: 'https://unpkg.com/gojs'
  });

  page.setContent('<div id="myDiagramDiv" style="border: solid 1px black; width:300px; height:300px"></div>');

  const imageData = await page.evaluate(nodeNames => {
    const $ = go.GraphObject.make; // for conciseness in defining templates

    var myDiagram = $(go.Diagram, "myDiagramDiv",
      {
        "animationManager.isEnabled": false,
        "undoManager.isEnabled": true,  // enable undo & redo
        layout: $(go.CircularLayout, {
          arrangement: go.CircularLayout.ConstantSpacing,
          sorting: go.CircularLayout.Forwards,
          startAngle: 270
        })
      });

    myDiagram.nodeTemplate =
      $(go.Node, 'Auto',
        // automatically save the Node.location to the node's data object
        new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Shape, 'RoundedRectangle', {
            strokeWidth: 0
          },
          new go.Binding('fill', 'color')),
        $(go.TextBlock,
          new go.Binding('text', 'key'))
      );

      myDiagram.linkTemplate = 
      $(
        go.Link,
        $(go.Shape)
      );

    // load a model from the command line args:
    var nodes = nodeNames.map(name => {
      return {
        'key': name,
        'color': 'lightblue'
      }
    });
    nodeNames.push(nodeNames[0]);
    var edges = [];
    for (var i = 0; i < nodeNames.length - 1; i++) {
      edges.push({
        from: nodeNames[i],
        to: nodeNames[i + 1]
      });
    }
    myDiagram.model = new go.GraphLinksModel(nodes, edges);
    return myDiagram.makeImageData({background: 'White'});
  }, process.argv.slice(2));

  const { buffer } = parseDataUrl(imageData);
  fs.writeFileSync('picture.png', buffer, 'base64');
  await browser.close();
})();

