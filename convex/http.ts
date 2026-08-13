/**
 * HTTP routes. Convex Auth registers its sign-in / callback routes here.
 */
import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { endpoint as jarvisTodosEndpoint } from './jarvisTodos';

const http = httpRouter();
auth.addHttpRoutes(http);
http.route({ path: '/api/jarvis/todos', method: 'POST', handler: jarvisTodosEndpoint });

export default http;
