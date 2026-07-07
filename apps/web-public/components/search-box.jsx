"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

export function SearchBox({ currentSearch }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(currentSearch || "");

  useEffect(() => {
    setValue(currentSearch || "");
  }, [currentSearch]);

  function submit(event) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const nextValue = value.trim();
    if (nextValue) {
      params.set("search", nextValue);
    } else {
      params.delete("search");
    }
    const suffix = params.toString();
    startTransition(() => router.push(suffix ? "/?" + suffix : "/"));
  }

  function clearSearch() {
    setValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    const suffix = params.toString();
    startTransition(() => router.push(suffix ? "/?" + suffix : "/"));
  }

  return (
    <form className="search-box" onSubmit={submit}>
      <label className="filter-label">
        搜索
        <div className="search-input-row">
          <input
            className="filter-input"
            value={value}
            placeholder="搜索标题、摘要、标签或正文"
            onChange={(event) => setValue(event.target.value)}
          />
          {value ? (
            <button type="button" className="mini-clear-button" onClick={clearSearch} aria-label="清空搜索">
              ×
            </button>
          ) : null}
        </div>
      </label>
      <button type="submit" className="search-submit-button">搜索</button>
    </form>
  );
}
