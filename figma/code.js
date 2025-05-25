// Main plugin code
figma.showUI(__html__, { width: 400, height: 600 });

// Function to create hashtag elements
async function createHashtagElements(hashtags, originalNode) {
  try {
    // Load the default font that Figma expects
    try {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    } catch (fontError) {
      // If Inter fails, try Arial
      try {
        await figma.loadFontAsync({ family: "Arial", style: "Regular" });
      } catch (arialError) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: 'Could not load fonts. Please try again.' 
        });
        return;
      }
    }

    // Parse hashtags into individual items
    var hashtagLines = hashtags.split('\n').filter(function(line) {
      return line.trim().length > 0 && line.trim().startsWith('#');
    });

    if (hashtagLines.length === 0) {
      figma.ui.postMessage({ 
        type: 'error', 
        message: 'No valid hashtags found to create.' 
      });
      return;
    }

    // Create the master hashtag component first
    var masterComponent = figma.createComponent();
    masterComponent.name = "Hashtag Component";
    masterComponent.resize(80, 30); // Set initial size
    
    // Style the master component
    masterComponent.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }]; // Light background
    masterComponent.cornerRadius = 12;
    
    // Set up auto layout for the master component
    masterComponent.layoutMode = "HORIZONTAL";
    masterComponent.primaryAxisSizingMode = "AUTO";
    masterComponent.counterAxisSizingMode = "AUTO";
    masterComponent.paddingTop = 6;
    masterComponent.paddingBottom = 6;
    masterComponent.paddingLeft = 12;
    masterComponent.paddingRight = 12;
    
    // Create text inside the master component
    var masterText = figma.createText();
    masterText.characters = "#hashtag";
    masterText.fontSize = 11;
    masterText.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.4, b: 0.9 } }]; // Blue color
    masterText.name = "Hashtag Text";
    
    masterComponent.appendChild(masterText);
    
    // Position the master component off-screen (so it doesn't interfere)
    masterComponent.x = -1000;
    masterComponent.y = -1000;
    
    // Add master component to the page
    figma.currentPage.appendChild(masterComponent);

    // Create a subframe for hashtag instances
    var hashtagFrame = figma.createFrame();
    hashtagFrame.name = "Generated Hashtags";
    hashtagFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]; // Light gray background
    hashtagFrame.cornerRadius = 8;
    
    // Set up auto layout for horizontal wrapping
    hashtagFrame.layoutMode = "HORIZONTAL";
    hashtagFrame.primaryAxisSizingMode = "FIXED"; // Fixed width
    hashtagFrame.counterAxisSizingMode = "AUTO"; // Auto height
    hashtagFrame.layoutWrap = "WRAP"; // Enable wrapping to next line
    hashtagFrame.itemSpacing = 8; // Horizontal spacing between hashtags
    hashtagFrame.counterAxisSpacing = 7; // Vertical spacing between lines
    hashtagFrame.paddingTop = 16;
    hashtagFrame.paddingBottom = 16;
    hashtagFrame.paddingLeft = 16;
    hashtagFrame.paddingRight = 16;
    
    var containerHeight = 80; // Base container height
    
    // Find the bottom of the actual content in the artboard
    var contentBottom = 0;
    if (originalNode.children && originalNode.children.length > 0) {
      // Find the lowest point of existing content
      for (var j = 0; j < originalNode.children.length; j++) {
        var child = originalNode.children[j];
        var childBottom = child.y + child.height;
        if (childBottom > contentBottom) {
          contentBottom = childBottom;
        }
      }
    }
    
    // If no content found, assume content starts at top
    if (contentBottom === 0) {
      contentBottom = 0;
    }
    
    // Position the frame 50px below the content
    hashtagFrame.x = 20; // 20px from left edge of artboard
    hashtagFrame.y = contentBottom + 50; // 50px below the bottom of existing content
    hashtagFrame.resize(originalNode.width - 40, containerHeight); // Full width minus 40px margin
    
    // Create hashtag instances from the master component
    var createdCount = 0;
    for (var i = 0; i < Math.min(hashtagLines.length, 20); i++) { // Limit to 20 hashtags
      var hashtag = hashtagLines[i].trim();
      if (hashtag) {
        // Create an instance of the master component
        var hashtagInstance = masterComponent.createInstance();
        hashtagInstance.name = "Hashtag: " + hashtag;
        
        // Update the text in the instance
        var textNode = hashtagInstance.findOne(function(node) {
          return node.type === "TEXT" && node.name === "Hashtag Text";
        });
        if (textNode) {
          textNode.characters = hashtag;
        }
        
        // Add instance to the frame
        hashtagFrame.appendChild(hashtagInstance);
        createdCount++;
      }
    }
    
    // Add the hashtag frame to the original artboard as a child
    originalNode.appendChild(hashtagFrame);
    
    // Select the hashtag frame to show the result
    figma.currentPage.selection = [hashtagFrame];
    figma.viewport.scrollAndZoomIntoView([hashtagFrame]);
    
    // Send both hashtags and success message to UI
    figma.ui.postMessage({ 
      type: 'hashtags-generated', 
      hashtags: hashtags,
      message: 'Created ' + createdCount + ' hashtag component instances! Edit the master component to style all hashtags.',
      selectedNode: {
        id: originalNode.id,
        width: originalNode.width,
        height: originalNode.height
      }
    });
    
  } catch (error) {
    figma.ui.postMessage({ 
      type: 'error', 
      message: 'Failed to create hashtag elements: ' + error.message
    });
  }
}

figma.ui.onmessage = async function(msg) {
  if (msg.type === 'generate-hashtags') {
    try {
      // Get the current selection
      var selection = figma.currentPage.selection;
      
      if (selection.length === 0) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: 'Please select an artboard or frame first.' 
        });
        return;
      }

      var node = selection[0];
      
      // Check if the selected node is a frame or component
      if (node.type !== 'FRAME' && node.type !== 'COMPONENT') {
        figma.ui.postMessage({ 
          type: 'error', 
          message: 'Please select a frame or artboard.' 
        });
        return;
      }

      figma.ui.postMessage({ type: 'loading', message: 'Exporting image...' });

      // Export the frame as PNG
      var imageBytes = await node.exportAsync({
        format: 'PNG',
        constraint: {
          type: 'SCALE',
          value: 1
        }
      });

      // Convert to base64
      var base64Image = figma.base64Encode(imageBytes);

      // Make the API call from the main thread instead of UI
      figma.ui.postMessage({ type: 'loading', message: 'Analyzing image with AI...' });
      
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + msg.apiKey
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Analyze this image and generate relevant hashtags for social media. Focus on: visual elements, colors, style, mood, objects, themes, and potential use cases. Return 15-25 hashtags as a simple list, each on a new line, starting with #. Make them specific and useful for discoverability.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: 'data:image/png;base64,' + base64Image
                    }
                  }
                ]
              }
            ],
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error('API request failed: ' + response.status + ' - ' + errorText);
        }

        const data = await response.json();
        const hashtags = data.choices[0].message.content.trim();
        
        // Automatically create the hashtag elements
        await createHashtagElements(hashtags, node);
        
      } catch (apiError) {
        figma.ui.postMessage({ 
          type: 'error', 
          message: 'OpenAI API Error: ' + apiError.message
        });
      }

    } catch (error) {
      figma.ui.postMessage({ 
        type: 'error', 
        message: 'Failed to export image: ' + error.message
      });
    }
  }
};