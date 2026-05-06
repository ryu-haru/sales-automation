import type { NextConfig } from 'next'
import path from 'path'

const config: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ['playwright', 'xlsx', 'csv-parse', 'nodemailer'],
}

export default config
