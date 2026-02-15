/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx) {
	  const url = new URL(request.url);
	  
	  // Route: Generate feedback
	  if (url.pathname === '/generate' && request.method === 'POST') {
		return await generateFeedback(request, env);
	  }
	  
	  // Route: Check progress
	  if (url.pathname === '/progress' && request.method === 'GET') {
		return await getProgress(env);
	  }
	  
	  // Route: List all feedbacks
	  if (url.pathname === '/list' && request.method === 'GET') {
		return await listFeedbacks(env);
	  }
	  
	  // Default route
	  return new Response('First Pro Feedback Generator API\n\nEndpoints:\n- POST /generate (body: {"count": 10})\n- GET /progress\n- GET /list', {
		status: 200,
		headers: { 'Content-Type': 'text/plain' }
	  });
	}
  };
  
  async function generateFeedback(request, env) {
	try {
	  // Parse request body
	  let count = 10; // default
	  try {
		const body = await request.json();
		count = body.count || 10;
	  } catch (e) {
		// If no body, use default
	  }
	  // Customize your product/app/software here!
	  const context = `We are a mobile training app for firefighters that turns real emergency incidents 
	  into short, AI-driven, 3-minute training scenarios. It helps preserve veteran experience, 
	  improve readiness by 40%, and ensure NERIS compliance with AI-generated content, 
	  mobile reference tools, admin dashboards, and department data integration.`;
	  
	  // Get current count from R2
	  let currentCount = 0;
	  try {
		const existingData = await env.MY_BUCKET.get('mock_feedback/metadata.json');
		if (existingData) {
		  const metadata = await existingData.json();
		  currentCount = metadata.count || 0;
		}
	  } catch (e) {
		console.log('No existing metadata, starting fresh');
	  }
	  
	  const feedbacks = [];
	  
	  // Generate feedbacks using Cloudflare AI
	  for (let i = 0; i < count; i++) {
		const feedbackId = currentCount + i + 1;
		// CUSTOMIZE Your Context Here!
		const prompt = `${context}
  
  Generate a brief, realistic user feedback or feature request (2-4 sentences max) from someone using First Pro. 
  DIVERSIFY THE USER TYPE AND TONE, this is IMPORTANT.
  Make it sound natural and conversational, like an actual user comment. Vary the user type (first-responder, non-first responder, kids, firefighter, chief, new recruit, veteran, admin, etc.) and tone (positive, constructive, excited, frustrated, etc.).
  
  Examples of the style:
  - "Love the app!"
  - "Hate the app, too expensive"
  - "We need notifications when new scenarios drop"
  - "As a training officer, the NERIS compliance tracking is a game-changer. Would be cool if we could export those reports as PDFs."
  
  Generate feedback #${feedbackId}/1000 (keep it brief and natural):`;
  
		// Call Cloudflare AI
		const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
		  messages: [
			{ role: 'system', content: 'You are generating realistic user feedback. Keep responses brief (2-4 sentences) and conversational.' },
			{ role: 'user', content: prompt }
		  ]
		});
		
		const feedbackText = response.response || response;
		
		feedbacks.push({
		  id: feedbackId,
		  feedback: feedbackText.trim(),
		  timestamp: new Date().toISOString()
		});
	  }
	  
	  // Save each feedback to R2 in the mock_feedback folder
	  for (const feedback of feedbacks) {
		await env.MY_BUCKET.put(
		  `mock_feedback/feedback_${String(feedback.id).padStart(4, '0')}.json`,
		  JSON.stringify(feedback, null, 2),
		  {
			httpMetadata: {
			  contentType: 'application/json'
			}
		  }
		);
	  }
	  
	  // Update metadata
	  const newCount = currentCount + count;
	  await env.MY_BUCKET.put(
		'mock_feedback/metadata.json',
		JSON.stringify({
		  count: newCount,
		  lastUpdated: new Date().toISOString()
		}, null, 2),
		{
		  httpMetadata: {
			contentType: 'application/json'
		  }
		}
	  );
	  
	  return new Response(JSON.stringify({
		success: true,
		generated: count,
		totalCount: newCount,
		feedbacks: feedbacks
	  }, null, 2), {
		headers: { 
		  'Content-Type': 'application/json',
		  'Access-Control-Allow-Origin': '*' // Allow CORS
		}
	  });
	  
	} catch (error) {
	  return new Response(JSON.stringify({
		success: false,
		error: error.message,
		stack: error.stack
	  }, null, 2), {
		status: 500,
		headers: { 'Content-Type': 'application/json' }
	  });
	}
  }
  
  async function getProgress(env) {
	try {
	  const metadata = await env.MY_BUCKET.get('mock_feedback/metadata.json');
	  if (!metadata) {
		return new Response(JSON.stringify({
		  count: 0,
		  progress: 0,
		  message: 'No feedbacks generated yet'
		}, null, 2), {
		  headers: { 
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		  }
		});
	  }
	  
	  const data = await metadata.json();
	  return new Response(JSON.stringify({
		count: data.count,
		progress: ((data.count / 1000) * 100).toFixed(2) + '%',
		lastUpdated: data.lastUpdated
	  }, null, 2), {
		headers: { 
		  'Content-Type': 'application/json',
		  'Access-Control-Allow-Origin': '*'
		}
	  });
	  
	} catch (error) {
	  return new Response(JSON.stringify({
		error: error.message
	  }, null, 2), {
		status: 500,
		headers: { 'Content-Type': 'application/json' }
	  });
	}
  }
  
  async function listFeedbacks(env) {
	try {
	  const listed = await env.MY_BUCKET.list({
		prefix: 'mock_feedback/',
		limit: 1000
	  });
	  
	  return new Response(JSON.stringify({
		count: listed.objects.length,
		files: listed.objects.map(obj => obj.key)
	  }, null, 2), {
		headers: { 
		  'Content-Type': 'application/json',
		  'Access-Control-Allow-Origin': '*'
		}
	  });
	  
	} catch (error) {
	  return new Response(JSON.stringify({
		error: error.message
	  }, null, 2), {
		status: 500,
		headers: { 'Content-Type': 'application/json' }
	  });
	}
  }
