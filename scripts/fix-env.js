const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const envMap = new Map();

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        // Handle potentially jammed lines e.g. KEY=VALNEXT=VAL
        // Regex is greedy, but standard format is KEY=VAL
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            envMap.set(match[1].trim(), match[2].trim());
        }
    });

    // Enforce Base URL if missing or broken
    if (!envMap.has('NEXT_PUBLIC_BASE_URL')) {
        envMap.set('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000');
    }

    let newContent = '# Cleaned .env.local\n\n';

    // Group 1: General
    newContent += '# App Settings\n';
    if (envMap.has('NEXT_PUBLIC_BASE_URL')) {
        newContent += `NEXT_PUBLIC_BASE_URL=${envMap.get('NEXT_PUBLIC_BASE_URL')}\n`;
        envMap.delete('NEXT_PUBLIC_BASE_URL');
    }

    // Group 2: LINE LIFF
    newContent += '\n# LINE LIFF\n';
    if (envMap.has('NEXT_PUBLIC_LIFF_ID')) {
        newContent += `NEXT_PUBLIC_LIFF_ID=${envMap.get('NEXT_PUBLIC_LIFF_ID')}\n`;
        envMap.delete('NEXT_PUBLIC_LIFF_ID');
    }

    // Group 3: Stripe
    newContent += '\n# Stripe API\n';
    const stripeKeys = ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY'];
    stripeKeys.forEach(k => {
        if (envMap.has(k)) {
            newContent += `${k}=${envMap.get(k)}\n`;
            envMap.delete(k);
        }
    });

    // Group 4: Others (Firebase etc)
    if (envMap.size > 0) {
        newContent += '\n# Other Keys (Firebase etc)\n';
        for (const [k, v] of envMap) {
            newContent += `${k}=${v}\n`;
        }
    }

    fs.writeFileSync(envPath, newContent, 'utf8');
    console.log('Successfully enforced .env.local structure');

} catch (e) {
    console.error(e);
}
