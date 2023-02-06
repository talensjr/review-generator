/* @refresh reload */

import { customElement } from "solid-element";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import cssString from "./index.css?inline";

const localUrl = `http://127.0.0.1:8787/`;
const remoteUrl = `https://cohere-review-generator.talensjr.workers.dev/`;

const getReview = async function (props, info) {
  const { refetching } = info;
  try {
    if (!refetching) return;
    const { itemCategory, itemName, maxScore, votes, highlights } = refetching;
    if (!votes || !itemCategory || !itemName || !maxScore) return;
    const response = await fetch(remoteUrl, {
      method: "POST",
      body: JSON.stringify({
        product: itemCategory,
        productName: itemName,
        totalStars: maxScore,
        stars: votes,
        highlights: highlights,
      }),
    });
    const result = (await response.json()) as any;

    return result.generations[0].text;
  } catch (e) {
    console.log("error: ", e);
    return new Error(e);
  }
};

customElement(
  "parent-elem",
  {
    itemCategory: "",
    itemName: "",
    maxScore: "",
    scoreItem: "",
    scoreItemSelected: "",
  },
  (props, { element }) => {
    const scoreItem = element.querySelector("[name=scoreitem]");
    const scoreItemSelected = element.querySelector("[name=scoreitemselected]");
    const styleTemplate = element.querySelector("[name=styles]");
    const [votes, setVotes] = createSignal(0);
    const [highlights, setHighlights] = createSignal("");
    const [data, { mutate, refetch }] = createResource(getReview);

    return (
      <>
        <style>{cssString}</style>
        {styleTemplate?.content?.cloneNode(true)}
        <div class="flex flex-col gap-2">
          <div class="flex gap-4">
            <For
              each={Array.from({ length: parseInt(props.maxScore, 10) }).map(
                (_, i) => i + 1
              )}
            >
              {(item) => {
                const isSelected = createMemo(() => votes() >= item);
                return (
                  <button
                    disabled={data.loading}
                    onClick={() => {
                      setVotes(item);
                    }}
                  >
                    {isSelected() ? (
                      <span>
                        {scoreItemSelected?.content?.cloneNode(true) ??
                          props.scoreItemSelected}
                      </span>
                    ) : (
                      <span>
                        {scoreItem?.content?.cloneNode(true) ?? props.scoreItem}
                      </span>
                    )}
                  </button>
                );
              }}
            </For>
          </div>

          <div class="flex flex-col items-start gap-2">
            <button
              disabled={data.loading || !votes()}
              style={{
                "font-family": "var(--font-family)",
              }}
              class="border-2 border-black py-2 px-4 hover:bg-black hover:text-white active:bg-slate-500 active:text-white active:border-slate-500 disabled:cursor-not-allowed fetch-button"
              onClick={() =>
                refetch({
                  itemCategory: props.itemCategory,
                  itemName: props.itemName,
                  maxScore: props.maxScore,
                  votes: votes(),
                  highlights: highlights(),
                })
              }
            >
              {data.loading
                ? "Generating review..."
                : data()
                ? "Generate a new one"
                : "Generate my review"}
            </button>
            <label class="flex gap-2 items-center">
              Some keywords?
              <input
                class="border border-slate-300 py-2 px-4"
                type="text"
                onInput={(e) => {
                  setHighlights(e.currentTarget.value);
                }}
              />
            </label>
            <Show when={!data.loading}>
              <p>{data()}</p>
            </Show>
            <button
              disabled={!data()}
              style={{
                "font-family": "var(--font-family)",
              }}
              class="border-2 border-black py-2 px-4 hover:bg-black hover:text-white active:bg-slate-500 active:text-white active:border-slate-500 disabled:cursor-not-allowed"
              onClick={(e) => {
                e.currentTarget.dispatchEvent(
                  new CustomEvent("onreviewsent", {
                    bubbles: true,
                    detail: {
                      score: votes(),
                      review: data(),
                    },
                    composed: true,
                  })
                );
              }}
            >
              Save review ✅
            </button>
          </div>
        </div>
      </>
    );
  }
);
