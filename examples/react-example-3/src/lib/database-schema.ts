// Example database schema for SQL autocomplete
// This can be customized to match your actual database schema

export const DATABASE_SCHEMA: Record<string, { columns: readonly string[]; description: string }> = {
  // Example tables - customize these for your database
  users: {
    columns: ['id', 'email', 'name', 'created_at', 'updated_at'],
    description: 'Users table'
  },
  posts: {
    columns: ['id', 'user_id', 'title', 'content', 'published', 'created_at', 'updated_at'],
    description: 'Posts table'
  },
  comments: {
    columns: ['id', 'post_id', 'user_id', 'content', 'created_at'],
    description: 'Comments table'
  },
}
