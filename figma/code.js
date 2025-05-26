// Main plugin code
figma.showUI(__html__, { width: 400, height: 600 });

// Function to create hashtag elements
async function createHashtagElements(hashtags, originalNode, categoryLabel) {
  try {
    // Load the default fonts that we'll need
    var regularFont = { family: "Inter", style: "Regular" };
    var mediumFont = { family: "Inter", style: "Medium" };
    
    try {
      await figma.loadFontAsync(regularFont);
      await figma.loadFontAsync(mediumFont);
    } catch (fontError) {
      // If Inter fails, try Arial
      try {
        regularFont = { family: "Arial", style: "Regular" };
        mediumFont = { family: "Arial", style: "Bold" }; // Use Bold instead of Medium
        await figma.loadFontAsync(regularFont);
        await figma.loadFontAsync(mediumFont);
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

    // Check if a Hashtag Component already exists
    var existingComponents = figma.currentPage.findAll(function(node) {
      return node.type === "COMPONENT" && node.name === "Hashtag Component";
    });
    
    var masterComponent;
    
    if (existingComponents.length > 0) {
      // Use the existing component
      masterComponent = existingComponents[0];
      figma.ui.postMessage({ type: 'loading', message: 'Using existing Hashtag Component...' });
    } else {
      // Create a new master hashtag component
      figma.ui.postMessage({ type: 'loading', message: 'Creating new Hashtag Component...' });
      
      masterComponent = figma.createComponent();
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
    }

    // Create a subframe for hashtag instances
    var hashtagFrame = figma.createFrame();
    hashtagFrame.name = "Generated Hashtags";
    hashtagFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]; // Light gray background
    hashtagFrame.cornerRadius = 8;
    
    // Set up auto layout for vertical stacking (label + hashtags)
    hashtagFrame.layoutMode = "VERTICAL";
    hashtagFrame.primaryAxisSizingMode = "FIXED"; // Fixed width
    hashtagFrame.counterAxisSizingMode = "AUTO"; // Auto height
    hashtagFrame.itemSpacing = 12; // Space between label and hashtags
    hashtagFrame.paddingTop = 16;
    hashtagFrame.paddingBottom = 16;
    hashtagFrame.paddingLeft = 16;
    hashtagFrame.paddingRight = 16;
    
    // Create category label
    var categoryText = figma.createText();
    categoryText.characters = categoryLabel || "Hashtags";
    categoryText.fontSize = 14;
    categoryText.fontName = mediumFont; // Use the loaded medium/bold font
    categoryText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]; // Dark gray
    categoryText.name = "Category Label";
    
    // Add category label to frame
    hashtagFrame.appendChild(categoryText);
    
    // Create a nested frame for the hashtags
    var hashtagsContainer = figma.createFrame();
    hashtagsContainer.name = "Hashtags Container";
    hashtagsContainer.fills = []; // Transparent background
    
    // Set up auto layout for horizontal wrapping hashtags
    hashtagsContainer.layoutMode = "HORIZONTAL";
    hashtagsContainer.primaryAxisSizingMode = "FIXED"; // Fixed width
    hashtagsContainer.counterAxisSizingMode = "AUTO"; // Auto height
    hashtagsContainer.layoutWrap = "WRAP"; // Enable wrapping to next line
    hashtagsContainer.itemSpacing = 8; // Horizontal spacing between hashtags
    hashtagsContainer.counterAxisSpacing = 7; // Vertical spacing between lines
    
    var containerHeight = 300; // Base container height
    
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
    
    // Position the hashtags container and size it
    hashtagsContainer.x = 0;
    hashtagsContainer.y = 0;
    hashtagsContainer.resize(originalNode.width - 72, 300); // Width minus padding, auto height will expand
    
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
        
        // Add instance to the hashtags container
        hashtagsContainer.appendChild(hashtagInstance);
        createdCount++;
      }
    }
    
    // Add the hashtags container to the main frame
    hashtagFrame.appendChild(hashtagsContainer);
    
    // Add the hashtag frame to the original artboard as a child
    originalNode.appendChild(hashtagFrame);
    
    // Select the hashtag frame to show the result
    figma.currentPage.selection = [hashtagFrame];
    figma.viewport.scrollAndZoomIntoView([hashtagFrame]);
    
    // Send both hashtags and success message to UI
    var componentMessage = existingComponents.length > 0 ? 
      'Used existing Hashtag Component! Created ' + createdCount + ' hashtag instances.' :
      'Created new Hashtag Component and ' + createdCount + ' hashtag instances!';
    
    figma.ui.postMessage({ 
      type: 'hashtags-generated', 
      hashtags: hashtags,
      message: componentMessage,
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
        
        // Generate a category label based on the hashtags
        figma.ui.postMessage({ type: 'loading', message: 'Generating category label...' });
        
        const categoryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                content: 'Based on these hashtags, generate a single, concise category label (1-3 words max) that best describes the overall theme. Just return the label, nothing else:\n\n' + hashtags
              }
            ],
            max_tokens: 20
          })
        });

        if (!categoryResponse.ok) {
          throw new Error('Category generation failed: ' + categoryResponse.status);
        }

        const categoryData = await categoryResponse.json();
        const categoryLabel = categoryData.choices[0].message.content.trim();
        
        // Automatically create the hashtag elements with category
        await createHashtagElements(hashtags, node, categoryLabel);
        
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