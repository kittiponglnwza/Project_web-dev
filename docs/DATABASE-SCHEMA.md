# Database Schema

## Sources and Scope

The repository contains one database setup script, [`data/setup_database.sql`](../data/setup_database.sql), and no migration directory, generated Supabase types, or other schema definition. This document describes the final structure produced by that script, including its later `ALTER TABLE bills` statements. Application queries are cross-check evidence, not proof of undeclared database objects or constraints.

A read-only request for the configured Supabase REST schema metadata returned HTTP 401. The deployed database could not be independently inspected, so “confirmed” below means confirmed by repository DDL; additional deployed objects or constraints may exist.

The script defines **4 confirmed tables** and **1 confirmed foreign key**. Supabase Auth is used by the application, but its managed `auth` schema is not defined by this project SQL and is not included as a project table here.

`SERIAL` columns are PostgreSQL integer columns with sequence-generated defaults. Unless stated otherwise, columns without `NOT NULL` are nullable. Defaults do not imply `NOT NULL`.

## Tables

### `tenant_profiles`

Purpose: tenant and administrator profile and lease details. RLS is enabled by the setup script.

| Column | Data type | Nullable | Default | Constraints / notes |
|---|---|---:|---|---|
| `id` | `SERIAL` | No | sequence-generated | Primary key |
| `email` | `TEXT` | No | — | Unique |
| `role` | `TEXT` | Yes | `'tenant'` | — |
| `national_id` | `TEXT` | Yes | — | — |
| `address` | `TEXT` | Yes | — | — |
| `room_no` | `TEXT` | Yes | — | No FK or uniqueness constraint |
| `lease_status` | `TEXT` | Yes | `'Active'` | — |
| `start_date` | `DATE` | Yes | — | — |
| `end_date` | `DATE` | Yes | — | — |
| `emergency_contact` | `TEXT` | Yes | — | — |
| `emergency_phone` | `TEXT` | Yes | — | — |

### `bills`

Purpose: tenant billing and payment-slip data. RLS is enabled by the setup script. `discount_amount`, `discount_detail`, and `promotion_id` are added after table creation by `ALTER TABLE` statements.

| Column | Data type | Nullable | Default | Constraints / notes |
|---|---|---:|---|---|
| `id` | `SERIAL` | No | sequence-generated | Primary key |
| `email` | `TEXT` | No | — | No FK to `tenant_profiles.email` in this SQL |
| `month` | `TEXT` | No | — | — |
| `room_no` | `TEXT` | Yes | — | — |
| `rent_fee` | `INTEGER` | Yes | `0` | — |
| `elec_unit` | `INTEGER` | Yes | `0` | — |
| `elec_fee` | `INTEGER` | Yes | `0` | — |
| `water_unit` | `INTEGER` | Yes | `0` | — |
| `water_fee` | `INTEGER` | Yes | `0` | — |
| `other_fee` | `INTEGER` | Yes | `0` | — |
| `amount` | `INTEGER` | No | — | — |
| `status` | `TEXT` | Yes | `'pending'` | — |
| `slip_image` | `TEXT` | Yes | — | — |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Yes | `TIMEZONE('utc', NOW())` | — |
| `discount_amount` | `INTEGER` | Yes | `0` | Added by `ALTER TABLE` |
| `discount_detail` | `TEXT` | Yes | — | Added by `ALTER TABLE` |
| `promotion_id` | `INTEGER` | Yes | — | FK to `promotions.id`; added by `ALTER TABLE` |

### `maintenance_requests`

Purpose: tenant maintenance reports. RLS is enabled by the setup script.

| Column | Data type | Nullable | Default | Constraints / notes |
|---|---|---:|---|---|
| `id` | `SERIAL` | No | sequence-generated | Primary key |
| `email` | `TEXT` | No | — | No FK to `tenant_profiles.email` in this SQL |
| `title` | `TEXT` | No | — | — |
| `description` | `TEXT` | Yes | — | — |
| `status` | `TEXT` | Yes | `'pending'` | — |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Yes | `TIMEZONE('utc', NOW())` | — |

### `promotions`

Purpose: configurable discounts that may be associated with bills. RLS is enabled by the setup script.

| Column | Data type | Nullable | Default | Constraints / notes |
|---|---|---:|---|---|
| `id` | `SERIAL` | No | sequence-generated | Primary key |
| `name` | `TEXT` | No | — | — |
| `description` | `TEXT` | Yes | — | — |
| `type` | `TEXT` | No | — | CHECK: `new_tenant`, `seasonal`, or `free_common_fee` |
| `discount_type` | `TEXT` | No | — | CHECK: `percent`, `fixed`, or `free_field` |
| `discount_value` | `NUMERIC` | Yes | `0` | — |
| `discount_field` | `TEXT` | Yes | `'rent_fee'` | — |
| `start_date` | `DATE` | Yes | — | — |
| `end_date` | `DATE` | Yes | — | — |
| `is_active` | `BOOLEAN` | Yes | `true` | — |
| `auto_apply` | `BOOLEAN` | Yes | `true` | — |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Yes | `TIMEZONE('utc', NOW())` | — |

## Relationships

| Referencing column → referenced column | Cardinality | Optionality / evidence |
|---|---|---|
| `bills.promotion_id` → `promotions.id` | N:1 from bills to promotions; equivalently 1:N from promotions to bills | Optional on the bill side because `promotion_id` is nullable. Declared in `data/setup_database.sql`. |

There are no confirmed 1:1 or N:M relationships in the project SQL, and no junction tables are defined.

## Unverified References

The following database API names occur in application code but have no table/view definition in the repository SQL. Their existence, object kind, full columns, data types, constraints, and relationships are **UNVERIFIED**. Field names below only record what the code reads, filters, or writes.

| Referenced object | Code-observed fields / use | Status |
|---|---|---|
| `rooms` | `id`, `type`, `description`, `price`, `isAvailable`, `availableCount`, `images`; queried with `select *` and filtered by `id` | **UNVERIFIED**; local `data/rooms.json` is fallback data, not database DDL |
| `occupied_rooms` | `room_no`; queried through REST. A code comment describes it as a view. | **UNVERIFIED** object and definition |
| `announcements` | `id`, `title`, `content`, `type`, `created_at`; selected and written by admin/tenant pages | **UNVERIFIED** |
| `messages` | `id`, `sender_email`, `receiver_email`, `message`, `created_at`, `is_read`, `is_contacted`; selected, inserted, and updated | **UNVERIFIED** |

The admin billing query requests a PostgREST embedded relation with `tenant_profiles(...)` from `bills` (`js/admin/billing.js`). The project SQL declares no FK connecting those tables. The query therefore depends on a relationship that is **UNVERIFIED** from the repository; its linking columns and cardinality cannot be confirmed here.

## RLS Policies

The setup script enables row-level security on all four confirmed tables. It defines policies for profile self/admin access, bill self/admin access, maintenance self/admin access, promotion management by admins, and public reads of active promotions. These policies compare email values to the authenticated JWT and do not create foreign keys.

## Design Checks

- `bills.email` and `maintenance_requests.email` are required strings, but neither references the unique `tenant_profiles.email`. The database can therefore contain orphaned billing or maintenance records if a profile is removed or an email changes.
- The admin billing page attempts to embed `tenant_profiles` in `bills`, but no corresponding FK is present in the checked SQL. This may fail unless the deployed Supabase schema has an undocumented relationship.
- `tenant_profiles.room_no` and `bills.room_no` are plain nullable text columns with no FK to a verified room entity. The SQL also has no uniqueness constraint on tenant room assignments or on a tenant's bill month; duplicate values are structurally allowed.
- `messages`, `announcements`, `rooms`, and `occupied_rooms` are required by application code but cannot be schema-validated from this repository.
