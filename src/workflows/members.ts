import { ghostApiClient } from "../ghostApi.js";

interface SegmentMembersParams {
    filter: string; // Ghost filter syntax, e.g., "status:free+created_at:<='2023-01-01'"
    add_tag?: string;
    remove_tag?: string;
    limit?: number; // Safety limit
}

export async function segmentMembers(params: SegmentMembersParams) {
    const limit = params.limit || 50; // Default safety limit
    
    // 1. Find members matching the filter
    const membersResponse: any = await ghostApiClient.members.browse({
        filter: params.filter,
        limit: limit
    });
    
    // Ghost API returns an array which also has a 'meta' property attached to it in the client response
    const members = membersResponse;
    const meta = membersResponse.meta;

    if (members.length === 0) {
        return { count: 0, message: "No members found matching filter." };
    }

    const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
    };

    // 2. Iterate and update with concurrency control
    const batchSize = 5;
    for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize);
        await Promise.all(batch.map(async (member: any) => {
            try {
                const updateData: any = { id: member.id };
                let labels = member.labels || [];

                if (params.add_tag) {
                    // Check if tag already exists
                    if (!labels.find((l: any) => l.name === params.add_tag)) {
                        labels.push({ name: params.add_tag });
                    }
                }

                if (params.remove_tag) {
                    labels = labels.filter((l: any) => l.name !== params.remove_tag);
                }

                updateData.labels = labels;

                await ghostApiClient.members.edit(updateData);
                results.success++;
            } catch (error: any) {
                results.failed++;
                results.errors.push(`Failed to update member ${member.email}: ${error.message}`);
            }
        }));
    }

    const totalAvailable = meta?.pagination?.total || members.length;
    const warning = totalAvailable > limit 
        ? `Warning: matched ${totalAvailable} members but only processed the first ${limit}. Increase 'limit' to process more.`
        : undefined;

    return {
        total_processed: members.length,
        total_matched: totalAvailable,
        ...results,
        warning
    };
}
