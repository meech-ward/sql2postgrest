//go:build wasm
// +build wasm

package main

import (
	"syscall/js"
	"sql2postgrest/pkg/converter"
	"sql2postgrest/pkg/reverse"
	"sql2postgrest/pkg/supabase"
)

func main() {
	c := make(chan struct{}, 0)

	// Forward converter: SQL → PostgREST
	js.Global().Set("sql2postgrest", js.FuncOf(convertSQL))

	// Reverse converter: PostgREST → SQL
	js.Global().Set("postgrest2sql", js.FuncOf(convertPostgREST))

	// Supabase converter: Supabase JS → PostgREST
	js.Global().Set("supabase2postgrest", js.FuncOf(convertSupabase))

	// Chained converter: Supabase JS → PostgREST → SQL
	js.Global().Set("supabase2sql", js.FuncOf(convertSupabaseToSQL))

	// Reverse Supabase converter: PostgREST → Supabase JS
	js.Global().Set("postgrest2supabase", js.FuncOf(convertPostgRESTToSupabase))

	// Chained converter: SQL → PostgREST → Supabase JS
	js.Global().Set("sql2supabase", js.FuncOf(convertSQLToSupabase))

	println("sql2postgrest WASM loaded (with reverse, Supabase, and chained converters)")
	<-c
}

func convertSQL(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{
			"error": "SQL query required as first argument",
		}
	}

	sql := args[0].String()

	baseURL := "http://localhost:3000"
	if len(args) >= 2 && !args[1].IsNull() && !args[1].IsUndefined() {
		baseURL = args[1].String()
	}

	conv := converter.NewConverter(baseURL)

	jsonOutput, err := conv.ConvertToJSON(sql)
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	return jsonOutput
}

func convertPostgREST(this js.Value, args []js.Value) interface{} {
	// Expected input: { method: "GET", path: "/users", query: "age=gte.18", body: "" }
	if len(args) < 1 {
		return map[string]interface{}{
			"error": "PostgREST request object required as first argument",
		}
	}

	input := args[0]

	// Extract fields from input object
	method := "GET"
	if !input.Get("method").IsUndefined() {
		method = input.Get("method").String()
	}

	path := ""
	if !input.Get("path").IsUndefined() {
		path = input.Get("path").String()
	}

	query := ""
	if !input.Get("query").IsUndefined() {
		query = input.Get("query").String()
	}

	body := ""
	if !input.Get("body").IsUndefined() {
		body = input.Get("body").String()
	}

	// Extract headers if present
	headers := make(map[string]string)
	if !input.Get("headers").IsUndefined() && !input.Get("headers").IsNull() {
		headersObj := input.Get("headers")
		// Iterate over header keys
		headerKeys := js.Global().Get("Object").Call("keys", headersObj)
		headerKeysLen := headerKeys.Length()
		for i := 0; i < headerKeysLen; i++ {
			key := headerKeys.Index(i).String()
			value := headersObj.Get(key).String()
			headers[key] = value
		}
	}

	// Validate required fields
	if path == "" {
		return map[string]interface{}{
			"error": "path is required (e.g., '/users')",
		}
	}

	// Convert
	conv := reverse.NewConverter()
	result, err := conv.ConvertWithHeaders(method, path, query, body, headers)
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	// Build response
	response := map[string]interface{}{
		"sql": result.SQL,
	}

	if len(result.Warnings) > 0 {
		// Convert warnings slice to interface slice for JS
		warnings := make([]interface{}, len(result.Warnings))
		for i, w := range result.Warnings {
			warnings[i] = w
		}
		response["warnings"] = warnings
	}

	if len(result.Metadata) > 0 {
		// Convert metadata map to interface map for JS
		metadata := make(map[string]interface{})
		for k, v := range result.Metadata {
			metadata[k] = v
		}
		response["metadata"] = metadata
	}

	if result.HTTPRequest != nil {
		// Convert headers map to interface map for JS
		headers := make(map[string]interface{})
		if result.HTTPRequest.Headers != nil {
			for k, v := range result.HTTPRequest.Headers {
				headers[k] = v
			}
		}

		response["http"] = map[string]interface{}{
			"method":  result.HTTPRequest.Method,
			"url":     result.HTTPRequest.URL,
			"headers": headers,
			"body":    result.HTTPRequest.Body,
		}
	}

	return response
}

func convertSupabase(this js.Value, args []js.Value) interface{} {
	// Expected input: Supabase JS query string
	if len(args) < 1 {
		return map[string]interface{}{
			"error": "Supabase query required as first argument",
		}
	}

	query := args[0].String()

	baseURL := "http://localhost:3000"
	if len(args) >= 2 && !args[1].IsNull() && !args[1].IsUndefined() {
		baseURL = args[1].String()
	}

	// Convert
	conv := supabase.NewConverter(baseURL)
	result, err := conv.Convert(query)
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	// Build response
	response := map[string]interface{}{
		"method": result.Method,
		"path":   result.Path,
	}

	if result.Query != "" {
		response["query"] = result.Query
	}

	if result.Body != "" {
		response["body"] = result.Body
	}

	if len(result.Headers) > 0 {
		// Convert headers map to JS object
		headersObj := make(map[string]interface{})
		for k, v := range result.Headers {
			headersObj[k] = v
		}
		response["headers"] = headersObj
	}

	if result.IsHTTPOnly {
		response["http_only"] = true
		if result.Description != "" {
			response["description"] = result.Description
		}
	}

	if len(result.Warnings) > 0 {
		// Convert warnings slice to interface slice for JS
		warnings := make([]interface{}, len(result.Warnings))
		for i, w := range result.Warnings {
			warnings[i] = w
		}
		response["warnings"] = warnings
	}

	// Full URL
	fullURL := baseURL + result.Path
	if result.Query != "" {
		fullURL += "?" + result.Query
	}
	response["url"] = fullURL

	return response
}

func convertSupabaseToSQL(this js.Value, args []js.Value) interface{} {
	// Expected input: Supabase JS query string
	if len(args) < 1 {
		return map[string]interface{}{
			"error": "Supabase query required as first argument",
		}
	}

	query := args[0].String()

	baseURL := "http://localhost:3000"
	if len(args) >= 2 && !args[1].IsNull() && !args[1].IsUndefined() {
		baseURL = args[1].String()
	}

	// Step 1: Convert Supabase → PostgREST
	supabaseConv := supabase.NewConverter(baseURL)
	postgrestResult, err := supabaseConv.Convert(query)
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	// Check if it's an HTTP-only operation (can't convert to SQL)
	if postgrestResult.IsHTTPOnly {
		return map[string]interface{}{
			"error":       "Cannot convert to SQL",
			"description": postgrestResult.Description,
			"warnings":    postgrestResult.Warnings,
		}
	}

	// Step 2: Convert PostgREST → SQL
	reverseConv := reverse.NewConverter()
	sqlResult, err := reverseConv.ConvertWithHeaders(
		postgrestResult.Method,
		postgrestResult.Path,
		postgrestResult.Query,
		postgrestResult.Body,
		postgrestResult.Headers,
	)
	if err != nil {
		return map[string]interface{}{
			"error": err.Error(),
		}
	}

	// Build response
	response := map[string]interface{}{
		"sql": sqlResult.SQL,
	}

	// Add intermediate PostgREST representation
	intermediate := map[string]interface{}{
		"method": postgrestResult.Method,
		"path":   postgrestResult.Path,
	}
	if postgrestResult.Query != "" {
		intermediate["query"] = postgrestResult.Query
	}
	if postgrestResult.Body != "" {
		intermediate["body"] = postgrestResult.Body
	}
	if len(postgrestResult.Headers) > 0 {
		headersObj := make(map[string]interface{})
		for k, v := range postgrestResult.Headers {
			headersObj[k] = v
		}
		intermediate["headers"] = headersObj
	}
	response["intermediate_postgrest"] = intermediate

	// Add warnings from both conversions
	allWarnings := []interface{}{}
	if len(postgrestResult.Warnings) > 0 {
		for _, w := range postgrestResult.Warnings {
			allWarnings = append(allWarnings, w)
		}
	}
	if len(sqlResult.Warnings) > 0 {
		for _, w := range sqlResult.Warnings {
			allWarnings = append(allWarnings, w)
		}
	}
	if len(allWarnings) > 0 {
		response["warnings"] = allWarnings
	}

	// Add metadata if present
	if len(sqlResult.Metadata) > 0 {
		metadataObj := make(map[string]interface{})
		for k, v := range sqlResult.Metadata {
			metadataObj[k] = v
		}
		response["metadata"] = metadataObj
	}

	// Add HTTP request info if present
	if sqlResult.HTTPRequest != nil {
		response["http"] = map[string]interface{}{
			"method":  sqlResult.HTTPRequest.Method,
			"url":     sqlResult.HTTPRequest.URL,
			"headers": sqlResult.HTTPRequest.Headers,
			"body":    sqlResult.HTTPRequest.Body,
		}
	}

	return response
}

// convertPostgRESTToSupabase converts a PostgREST request object to supabase-js.
// Expected input: { method, path, query, body, headers }
func convertPostgRESTToSupabase(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{"error": "PostgREST request object required as first argument"}
	}
	input := args[0]

	method := "GET"
	if !input.Get("method").IsUndefined() && !input.Get("method").IsNull() {
		method = input.Get("method").String()
	}
	path := ""
	if !input.Get("path").IsUndefined() && !input.Get("path").IsNull() {
		path = input.Get("path").String()
	}
	query := ""
	if !input.Get("query").IsUndefined() && !input.Get("query").IsNull() {
		query = input.Get("query").String()
	}
	body := ""
	if !input.Get("body").IsUndefined() && !input.Get("body").IsNull() {
		body = input.Get("body").String()
	}

	headers := make(map[string]string)
	if !input.Get("headers").IsUndefined() && !input.Get("headers").IsNull() {
		headersObj := input.Get("headers")
		keys := js.Global().Get("Object").Call("keys", headersObj)
		for i := 0; i < keys.Length(); i++ {
			key := keys.Index(i).String()
			headers[key] = headersObj.Get(key).String()
		}
	}

	if path == "" {
		return map[string]interface{}{"error": "path is required (e.g., '/users')"}
	}

	result, err := reverse.ConvertToSupabaseJS(method, path, query, body, headers)
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}
	return supabaseJSResponse(result)
}

// convertSQLToSupabase chains SQL → PostgREST → supabase-js.
func convertSQLToSupabase(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{"error": "SQL query required as first argument"}
	}
	sql := args[0].String()

	baseURL := "http://localhost:3000"
	if len(args) >= 2 && !args[1].IsNull() && !args[1].IsUndefined() {
		baseURL = args[1].String()
	}

	conv := converter.NewConverter(baseURL)
	res, err := conv.Convert(sql)
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}

	result, err := reverse.ConvertToSupabaseJS(res.Method, res.Path, res.QueryParams.Encode(), res.Body, res.Headers)
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}

	response := supabaseJSResponse(result)
	intermediate := map[string]interface{}{
		"method": res.Method,
		"path":   res.Path,
	}
	if q := res.QueryParams.Encode(); q != "" {
		intermediate["query"] = q
	}
	if res.Body != "" {
		intermediate["body"] = res.Body
	}
	response["intermediate_postgrest"] = intermediate
	return response
}

func supabaseJSResponse(result *reverse.SupabaseJSResult) map[string]interface{} {
	response := map[string]interface{}{"code": result.Code}
	if len(result.Warnings) > 0 {
		warnings := make([]interface{}, len(result.Warnings))
		for i, w := range result.Warnings {
			warnings[i] = w
		}
		response["warnings"] = warnings
	}
	return response
}
