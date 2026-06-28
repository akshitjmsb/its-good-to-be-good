/**
 * HTTP routes. Convex Auth registers its sign-in / callback routes here.
 */
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
