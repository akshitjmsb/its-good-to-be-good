declare module '@storybook/react' {
  export type Meta<T = unknown> = {
    title?: string;
    component?: unknown;
    parameters?: Record<string, unknown>;
    tags?: string[];
    argTypes?: Record<string, unknown>;
  };

  export type StoryObj<T = unknown> = {
    args?: Record<string, unknown>;
    render?: (...args: unknown[]) => unknown;
  };
}
