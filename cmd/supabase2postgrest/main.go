package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"sql2postgrest/pkg/supabase"
)

func main() {
	// Command line flags
	pretty := flag.Bool("pretty", false, "Pretty print JSON output")
	baseURL := flag.String("url", "http://localhost:3000", "Base URL for PostgREST server")
	flag.Parse()

	// Get the Supabase query from arguments
	args := flag.Args()
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "Usage: supabase2postgrest [options] <supabase-query>\n")
		fmt.Fprintf(os.Stderr, "\nOptions:\n")
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nExamples:\n")
		fmt.Fprintf(os.Stderr, "  supabase2postgrest \"supabase.from('users').select('*')\"\n")
		fmt.Fprintf(os.Stderr, "  supabase2postgrest \"supabase.from('users').select('*').eq('age', 18)\"\n")
		fmt.Fprintf(os.Stderr, "  supabase2postgrest \"supabase.from('users').insert({name: 'John', age: 30})\"\n")
		fmt.Fprintf(os.Stderr, "  supabase2postgrest --pretty \"supabase.from('posts').select('*').order('created_at', {ascending: false}).limit(10)\"\n")
		os.Exit(1)
	}

	query := args[0]

	// Create converter
	converter := supabase.NewConverter(*baseURL)

	// Convert the query
	result, err := converter.Convert(query)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	// Build output
	output := map[string]interface{}{
		"method": result.Method,
		"path":   result.Path,
	}

	if result.Query != "" {
		output["query"] = result.Query
	}

	if result.Body != "" {
		output["body"] = result.Body
	}

	if len(result.Headers) > 0 {
		output["headers"] = result.Headers
	}

	if result.IsHTTPOnly {
		output["http_only"] = true
		if result.Description != "" {
			output["description"] = result.Description
		}
	}

	if len(result.Warnings) > 0 {
		output["warnings"] = result.Warnings
	}

	// Full URL
	fullURL := *baseURL + result.Path
	if result.Query != "" {
		fullURL += "?" + result.Query
	}
	output["url"] = fullURL

	// Print JSON output
	var jsonBytes []byte
	if *pretty {
		jsonBytes, err = json.MarshalIndent(output, "", "  ")
	} else {
		jsonBytes, err = json.Marshal(output)
	}

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling output: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(jsonBytes))
}
