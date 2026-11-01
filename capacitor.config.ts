import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "org.ems.dms.app",
  appName: "EMS Preacher Portal",
  webDir: "public",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      backgroundColor: "#1c2111",
    },
  },
}

export default config
