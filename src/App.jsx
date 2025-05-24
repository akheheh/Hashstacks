import React, { useState } from 'react';
import { Upload, Camera, Hash, Loader2, Key, Heart, Send, Bookmark } from 'lucide-react';

const ImageHashtagGenerator = () => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [hashtags, setHashtags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isStackExpanded, setIsStackExpanded] = useState(false);
  const [stackLabel, setStackLabel] = useState('');

  // Generate a category label based on hashtags
  const generateStackLabel = (tags) => {
    if (tags.length === 0) return '';
    
    // Common category keywords and their labels
    const categories = {
      'Beach/Ocean': ['beach', 'ocean', 'sea', 'waves', 'sand', 'tropical', 'coastline', 'shore', 'surfing'],
      'Nature': ['nature', 'forest', 'trees', 'mountains', 'hiking', 'wilderness', 'outdoor', 'landscape'],
      'Food': ['food', 'delicious', 'cuisine', 'restaurant', 'cooking', 'meal', 'dining', 'tasty'],
      'City/Urban': ['city', 'urban', 'architecture', 'building', 'street', 'downtown', 'skyline'],
      'Animals': ['pet', 'dog', 'cat', 'animal', 'wildlife', 'cute', 'furry', 'puppy', 'kitten'],
      'Travel': ['travel', 'vacation', 'adventure', 'journey', 'explore', 'destination', 'trip'],
      'Photography': ['photography', 'photo', 'camera', 'artistic', 'creative', 'visual', 'capture'],
      'Sports': ['sports', 'fitness', 'exercise', 'athletic', 'game', 'competition', 'training'],
      'Art': ['art', 'artistic', 'creative', 'design', 'painting', 'drawing', 'colorful'],
      'Technology': ['tech', 'technology', 'digital', 'modern', 'innovation', 'electronic']
    };
    
    const tagLower = tags.map(tag => tag.toLowerCase());
    
    // Find the category with the most matches
    let bestCategory = '';
    let maxMatches = 0;
    
    Object.entries(categories).forEach(([category, keywords]) => {
      const matches = keywords.filter(keyword => 
        tagLower.some(tag => tag.includes(keyword) || keyword.includes(tag))
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
      }
    });
    
    // If no clear category found, use the most prominent tag
    if (maxMatches === 0 && tags.length > 0) {
      return tags[0].charAt(0).toUpperCase() + tags[0].slice(1);
    }
    
    return bestCategory || 'Mixed';
  };

  // Convert image to base64
  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file selection
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
      setError('Please select an image file');
      return;
    }
    
    // Check file size (OpenAI has a 20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be smaller than 20MB');
      return;
    }
    
    setError('');
    setHashtags([]);
    setImage(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // OpenAI Vision API analysis function
  const analyzeImage = async () => {
    if (!image) return;
    
    if (!apiKey.trim()) {
      setError('Please enter your OpenAI API key');
      setShowApiKeyInput(true);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Convert image to base64
      const base64Image = await imageToBase64(image);
      
      console.log('Analyzing image with OpenAI...');
      
      // Call OpenAI Vision API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this image and generate relevant hashtags based on what you see. Return only a comma-separated list of hashtag words (without the # symbol). Focus on objects, scenery, activities, colors, mood, and style. Limit to 8-12 hashtags.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image,
                    detail: 'low'
                  }
                }
              ]
            }
          ],
          max_tokens: 150,
          temperature: 0.3
        })
      });

      console.log('OpenAI response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a moment.');
        } else {
          throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('OpenAI response:', data);

      // Extract hashtags from the response
      const content = data.choices[0]?.message?.content;
      if (content) {
        // Split by comma and clean up the tags
        const extractedTags = content
          .split(',')
          .map(tag => tag.trim().toLowerCase().replace(/^#/, ''))
          .filter(tag => tag.length > 0 && tag.length < 25)
          .slice(0, 12);

        setHashtags(extractedTags);
        setStackLabel(generateStackLabel(extractedTags));
        setIsStackExpanded(false);
      } else {
        throw new Error('No content received from OpenAI');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error in OpenAI analysis:', err);
      setError(err.message || 'Failed to analyze image. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <style jsx>{`
        @keyframes bounce-in {
          0% {
            transform: perspective(1000px) rotateX(0deg) rotateY(0deg) scale(0.3) translateY(-200px);
            opacity: 0;
          }
          50% {
            transform: perspective(1000px) rotateX(10deg) rotateY(5deg) scale(1.1) translateY(20px);
            opacity: 0.8;
          }
          70% {
            transform: perspective(1000px) rotateX(-5deg) rotateY(-2deg) scale(0.95) translateY(-10px);
            opacity: 0.9;
          }
          100% {
            transform: perspective(1000px) rotateX(var(--final-rotate-x, 15deg)) rotateY(var(--final-rotate-y, 0deg)) scale(1) translateY(0px);
            opacity: 1;
          }
        }
        
        @keyframes wiggle {
          0%, 100% { transform: translateX(0px) translateY(0px) rotate(var(--rotate, 0deg)); }
          25% { transform: translateX(1px) translateY(-1px) rotate(calc(var(--rotate, 0deg) + 1deg)); }
          75% { transform: translateX(-1px) translateY(1px) rotate(calc(var(--rotate, 0deg) - 1deg)); }
        }
        
        @keyframes stack-collapse {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.05) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        
        .animate-wiggle {
          animation: wiggle 2s ease-in-out infinite;
        }
        
        .animate-stack-collapse {
          animation: stack-collapse 0.6s ease-in-out;
        }
        
        .instagram-gradient {
          background: linear-gradient(45deg, #6366f1, #8b5cf6, #a855f7, #d946ef, #ec4899, #f43f5e);
        }
        
        .instagram-gradient-subtle {
          background: linear-gradient(45deg, #f3e8ff, #fce7f3, #fed7e2, #fecaca);
        }
        
        .instagram-story-gradient {
          background: linear-gradient(45deg, #8b5cf6, #ec4899, #f59e0b);
        }
      `}</style>
      
      <div className="w-full max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Instagram-style Header */}
        <div className="w-full instagram-gradient p-6 text-white">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
              <Hash className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">HashStacks</h1>
          </div>
          <p className="text-center text-white/80 text-sm mt-2">A better way to hashtag on IG, with a sprinkle of AI.</p>
        </div>
        
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row min-h-[600px]">
          
          {/* Left Column - Image Upload (1/3 width) */}
          <div className="lg:w-1/3 p-8 border-r border-gray-200 bg-gray-50/50">
            {/* API Key Input */}
            {showApiKeyInput && (
              <div className="mb-6 p-4 rounded-2xl border border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center mb-3">
                  <div className="p-2 instagram-gradient rounded-full mr-3">
                    <Key className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Connect OpenAI</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  Enter your API key to unlock AI-powered hashtag generation
                </p>
                <div className="flex flex-col gap-2">
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setShowApiKeyInput(false)}
                    className="px-6 py-3 instagram-gradient text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Upload section */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Upload Image</h2>
              <div className={`border rounded-2xl p-8 text-center transition-all ${image ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50' : 'border-gray-300 hover:border-purple-300'}`}>
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                {!imagePreview ? (
                  <label htmlFor="imageUpload" className="cursor-pointer flex flex-col items-center">
                    <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-4">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-gray-800 font-semibold text-lg">Add a photo</p>
                    <p className="text-gray-500 text-sm mt-1">PNG, JPG, GIF up to 20MB</p>
                  </label>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="relative w-full max-w-sm mb-4 overflow-hidden rounded-2xl shadow-lg">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-64 object-cover"
                      />
                      <button
                        onClick={() => {
                          setImage(null);
                          setImagePreview(null);
                          setHashtags([]);
                          setIsStackExpanded(false);
                          setStackLabel('');
                        }}
                        className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors backdrop-blur-sm"
                        title="Remove image"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-3 w-full">
                      <button
                        onClick={analyzeImage}
                        disabled={loading}
                        className="flex items-center justify-center px-6 py-3 instagram-gradient text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-60 transition-opacity shadow-lg w-full"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Camera className="w-5 h-5 mr-2" />
                            Generate Tags
                          </>
                        )}
                      </button>
                      
                      {!showApiKeyInput && (
                        <button
                          onClick={() => setShowApiKeyInput(true)}
                          className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors w-full"
                          title="Configure API Key"
                        >
                          <Key className="w-5 h-5 mr-2" />
                          Configure API Key
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Hashtags Display (2/3 width) */}
          <div className="lg:w-2/3 p-8">
            {hashtags.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="p-2 instagram-story-gradient rounded-full mr-3">
                      <Hash className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">Your hashtags</h2>
                      <p className="text-gray-500 text-sm">{hashtags.length} tags generated</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsStackExpanded(!isStackExpanded)}
                    className="px-6 py-3 instagram-gradient text-white text-sm rounded-xl font-medium hover:opacity-90 transition-opacity"
                  >
                    {isStackExpanded ? 'Stack View' : 'Expand All'}
                  </button>
                </div>
                
                {/* Stack View */}
                {!isStackExpanded ? (
                  <div className="flex justify-center mb-8">
                    <div 
                      className={`relative cursor-pointer group transition-all duration-700 ${isStackExpanded ? 'animate-stack-collapse' : ''}`}
                      onClick={() => setIsStackExpanded(true)}
                      style={{ height: '80px', width: '300px' }}
                    >
                      {/* Label card (top of stack) */}
                      {stackLabel && (
                        <div
                          className={`absolute instagram-story-gradient text-white px-6 py-3 rounded-full font-bold shadow-xl transition-all duration-500 group-hover:shadow-2xl ${!isStackExpanded ? 'animate-wiggle' : ''}`}
                          style={{
                            transform: `translateX(-2px) translateY(-6px) rotate(-3deg)`,
                            zIndex: hashtags.length + 1,
                            transformOrigin: 'center center'
                          }}
                        >
                          {stackLabel}
                        </div>
                      )}
                      
                      {/* Stack of hashtags */}
                      {hashtags.slice(0, Math.min(5, hashtags.length)).map((tag, index) => (
                        <div
                          key={index}
                          className={`absolute bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-6 py-3 rounded-full font-medium shadow-lg border border-purple-200 transition-all duration-500 group-hover:shadow-xl ${!isStackExpanded ? 'animate-wiggle' : ''}`}
                          style={{
                            transform: `translateX(${index * 3}px) translateY(${index * 4}px) rotate(${(index - 2) * 2}deg)`,
                            zIndex: hashtags.length - index,
                            transformOrigin: 'center center',
                            animationDelay: `${index * 50}ms`
                          }}
                        >
                          #{index === 0 ? tag : '...'}
                        </div>
                      ))}
                      
                      {/* Stack counter */}
                      {hashtags.length > 1 && (
                        <div className="absolute -top-3 -right-3 instagram-gradient text-white text-sm rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg z-40 animate-pulse">
                          {hashtags.length}
                        </div>
                      )}
                      
                      {/* Click hint */}
                      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Click to expand all hashtags
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Expanded View */
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                    {/* Include the label in expanded view */}
                    {stackLabel && (
                      <div
                        className="relative group cursor-pointer animate-bounce-in col-span-2"
                        onClick={() => navigator.clipboard.writeText(stackLabel)}
                        title="Click to copy category"
                        style={{
                          animationDelay: '0ms',
                          animationDuration: '800ms'
                        }}
                      >
                        <div className="instagram-story-gradient text-white px-4 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl text-center">
                          {stackLabel}
                        </div>
                      </div>
                    )}
                    
                    {hashtags.map((tag, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer animate-bounce-in"
                        onClick={() => navigator.clipboard.writeText(`#${tag}`)}
                        title="Click to copy"
                        style={{
                          animationDelay: `${(index + 1) * 100}ms`,
                          animationDuration: `${600 + Math.random() * 400}ms`
                        }}
                      >
                        <div className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-4 py-3 rounded-xl font-medium shadow-lg border border-purple-200 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:from-purple-200 hover:to-pink-200 text-center">
                          #{tag}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Action Bar */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <div className="flex items-center space-x-6">
                    <Heart className="w-7 h-7 text-gray-400 hover:text-red-500 cursor-pointer transition-colors" />
                    <Send className="w-7 h-7 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" />
                    <Bookmark className="w-7 h-7 text-gray-400 hover:text-purple-500 cursor-pointer transition-colors" />
                  </div>
                  <button
                    onClick={() => {
                      const allTags = hashtags.map(tag => `#${tag}`).join(' ');
                      navigator.clipboard.writeText(allTags);
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Copy All Tags
                  </button>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-gray-500 text-sm text-center">
                    Powered by OpenAI Vision • Click hashtags to copy
                  </p>
                </div>
              </div>
            ) : (
              /* Empty State for Right Column */
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mb-6 w-20 h-20 flex items-center justify-center mx-auto">
                    <Hash className="h-10 w-10 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload an image to get started</h3>
                  <p className="text-gray-500">Your AI-generated hashtags will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageHashtagGenerator;