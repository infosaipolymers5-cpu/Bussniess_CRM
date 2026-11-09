/**
 * Initial Business & Owner Seed Script for Neon DB
 * Rushi CRM Platform v2.0
 */

import pg from 'pg';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_wZc9mVASfG0o@ep-young-river-b3ue574y-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to Neon DB.');

  // 1. Seed the two businesses
  await client.query(`
    INSERT INTO public.businesses (id, kind, name, timezone) VALUES
      ('10000000-0000-0000-0000-000000000001', 'cattle_feed', 'Rushi Cattle Feed', 'Asia/Kolkata'),
      ('10000000-0000-0000-0000-000000000002', 'pvc', 'Rushi PVC Pipes & Fittings', 'Asia/Kolkata')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      timezone = EXCLUDED.timezone;
  `);
  console.log('Seeded businesses: Rushi Cattle Feed & Rushi PVC Pipes');

  // 2. Seed business settings
  await client.query(`
    INSERT INTO public.business_settings (
      business_id, 
      upi_id,
      bank_name,
      bank_account_no,
      bank_ifsc,
      invoice_footer_notes_en, 
      invoice_footer_notes_mr,
      default_payment_reminder_days,
      default_feed_finish_buffer_days
    ) VALUES
      (
        '10000000-0000-0000-0000-000000000001',
        'rushi.agro@upi',
        'State Bank of India',
        '30981234567',
        'SBIN0001234',
        'All disputes subject to local jurisdiction. Goods once sold will not be taken back.',
        'सर्व वाद स्थानिक न्यायालयाच्या अखत्यारीत येतील. विकलेला माल परत घेतला जाणार नाही.',
        7,
        5
      ),
      (
        '10000000-0000-0000-0000-000000000002',
        'rushi.pvc@upi',
        'HDFC Bank',
        '50100987654321',
        'HDFC0005678',
        'GST invoice mandatory for warranty. 18% interest on overdue bills beyond 30 days.',
        'वॉरंटीसाठी जीएसटी बिल आवश्यक. ३० दिवसांनंतर थकबाकीवर १८% व्याज आकारले जाईल.',
        7,
        5
      )
    ON CONFLICT (business_id) DO NOTHING;
  `);
  console.log('Seeded bilingual business settings & terms.');

  // 3. Create default owner account if not exists
  const ownerEmail = 'owner@rushicrm.com';
  const ownerId = '00000000-0000-0000-0000-000000000001';

  await client.query(`
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      role,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '${ownerId}',
      '${ownerEmail}',
      'dummy_password_hash',
      'authenticated',
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Aditya (Owner)"}',
      now(),
      now()
    ) ON CONFLICT (id) DO NOTHING;
  `);

  await client.query(`
    INSERT INTO public.profiles (id, full_name, preferred_locale)
    VALUES ('${ownerId}', 'Aditya (Owner)', 'mr')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  `);

  // 4. Link Owner to both businesses as 'owner'
  await client.query(`
    INSERT INTO public.business_memberships (user_id, business_id, role, is_active)
    VALUES 
      ('${ownerId}', '10000000-0000-0000-0000-000000000001', 'owner', true),
      ('${ownerId}', '10000000-0000-0000-0000-000000000002', 'owner', true)
    ON CONFLICT (user_id, business_id) DO UPDATE SET role = 'owner', is_active = true;
  `);
  console.log(`Seeded Owner account: ${ownerEmail} with owner role on both businesses.`);

  const { rows: businesses } = await client.query('SELECT id, kind, name FROM public.businesses');
  console.log('\nLive Businesses in Neon DB:');
  console.table(businesses);

  await client.end();
  console.log('\nAll initial data seeded successfully to Neon DB.');
}

main().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
