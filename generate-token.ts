import { googleAuthService } from "./src/services/googleAuthService.js";
import { logger } from "./src/utils/logger.js";

async function main() {
  try {
    logger.info("auth", "Starting interactive authentication flow...");
    await googleAuthService.getAuthenticatedClient();
    logger.info("auth", "Authentication complete! token.json has been generated.");
    process.exit(0);
  } catch (error) {
    logger.error("auth", "Authentication failed", { error });
    process.exit(1);
  }
}

main();
