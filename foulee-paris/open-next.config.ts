import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Config OpenNext pour Cloudflare Workers. Cache par défaut (pas de cache
// incrémental persistant) : suffisant, toutes nos routes sont `force-dynamic`.
export default defineCloudflareConfig()
