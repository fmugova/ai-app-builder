# To resolve migration drift and mark all migrations as applied (baseline resolved), run:

npx prisma migrate resolve --applied 20251230055401_add_form_submissions

# This marks the latest migration as applied in your local history.
# If you want to mark all previous migrations as applied, you can run:

npx prisma migrate resolve --applied 20251213185928_add_marketing_hub
npx prisma migrate resolve --applied 20251102112427_init
npx prisma migrate resolve --applied 20251211224438_fix_project_model_and_add_indexes
npx prisma migrate resolve --applied 20251220184143_fix_schema_relations
npx prisma migrate resolve --applied 20251220195958_add_billing_fields_to_user
npx prisma migrate resolve --applied 20251222110943_initial_baseline
npx prisma migrate resolve --applied 20251222164536_add_vercel_tables
npx prisma migrate resolve --applied 20251224204111_baseline_publish_fields
npx prisma migrate resolve --applied 20251230055401_add_form_submissions

# After running these commands, your local migration history will match the database.
# You can now safely run future migrations.
