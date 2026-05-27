import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mammoth from 'npm:mammoth@1.9.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, file_name, label } = await req.json();
        if (!file_url) {
            return Response.json({ error: 'file_url is required' }, { status: 400 });
        }

        console.log(`[extractDocumentText] label="${label}" file_name="${file_name}" url="${file_url}"`);

        const isDocx = file_name?.toLowerCase().endsWith('.docx') ||
                       file_url.toLowerCase().includes('.docx');

        let text = '';

        if (isDocx) {
            // Fetch the file bytes and extract text with mammoth
            const fileRes = await fetch(file_url);
            if (!fileRes.ok) {
                return Response.json({ error: `Failed to fetch file: ${fileRes.status}` }, { status: 500 });
            }
            const arrayBuffer = await fileRes.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);
            const result = await mammoth.extractRawText({ buffer });
            text = result.value || '';
        } else {
            // PDF: use InvokeLLM with file_urls (vision model handles PDFs well)
            const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `Extract the complete plain text content from this PDF document. Output ONLY the raw text — no commentary, no summary, no extra formatting. Preserve all headings, paragraphs, numbered lists, bullet points, and table content as plain text. Do not omit or paraphrase anything.`,
                file_urls: [file_url],
                response_json_schema: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'The complete verbatim plain text content of the document'
                        }
                    },
                    required: ['text']
                }
            });
            text = result?.text || '';
        }

        if (!text.trim()) {
            return Response.json({ error: 'No text could be extracted from the document.' }, { status: 422 });
        }

        console.log(`[extractDocumentText] SUCCESS label="${label}" extracted ${text.length} chars — preview: ${text.slice(0, 150)}`);

        return Response.json({ text, label: label || 'document' });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});