// Retry helper — most timeouts are transient, a retry usually succeeds.
// Used by the Build flow to wrap each AI call.
export async function callWithRetry(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxRetries) throw err;
            console.log(`Attempt ${attempt} failed, retrying in 3s...`, err.message);
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}