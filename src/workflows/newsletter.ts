import { ghostApiClient } from "../ghostApi.js";

interface PublishNewsletterParams {
    title: string;
    html: string;
    segment?: 'all' | 'free' | 'paid' | string; // e.g. "status:free"
    schedule_at?: string; // ISO string
    newsletter_id?: string; // Specific newsletter list ID
    tags?: string[];
}

export async function publishNewsletter(params: PublishNewsletterParams) {
    // 1. Prepare post data
    const postData: any = {
        title: params.title,
        html: params.html,
        status: params.schedule_at ? 'scheduled' : 'published',
        tags: params.tags ? params.tags.map(t => ({ name: t })) : [],
    };

    if (params.schedule_at) {
        postData.published_at = params.schedule_at;
    }

    // 2. Configure email distribution
    // Ghost uses specific query parameters or body fields to trigger email sending.
    // Usually, we set `newsletter_id` and `email_recipient_filter`.
    
    let newsletterName = "Default";

    // Default to the first active newsletter if not provided
    if (!params.newsletter_id) {
        const newsletters = await ghostApiClient.newsletters.browse({ limit: 1, filter: 'status:active' });
        if (newsletters.length > 0) {
            postData.newsletter_id = newsletters[0].id;
            newsletterName = newsletters[0].name || "Default";
        } else {
            throw new Error("No active newsletter found. Cannot publish as newsletter.");
        }
    } else {
        postData.newsletter_id = params.newsletter_id;
        // Optionally verify the newsletter exists, but trusting the ID saves a call.
    }

    // Set recipients
    postData.email_recipient_filter = params.segment || 'all';

    // 3. Create the post (which triggers the schedule/publish workflow in Ghost)
    // We use source: 'html' to tell Ghost to parse the HTML content
    const post = await ghostApiClient.posts.add(postData, { source: 'html' });

    return {
        id: post.id,
        title: post.title,
        status: post.status,
        url: post.url,
        newsletter: newsletterName,
        recipient_filter: postData.email_recipient_filter,
        scheduled_at: post.published_at || params.schedule_at || "Immediate"
    };
}
