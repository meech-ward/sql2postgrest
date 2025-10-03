//go:build wasm
// +build wasm

package main

import (
	"syscall/js"
	"sql2postgrest/pkg/converter"
)

func main() {
	c := make(chan struct{}, 0)
	
	js.Global().Set("sql2postgrest", js.FuncOf(convertSQL))
	
	println("sql2postgrest WASM loaded")
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
