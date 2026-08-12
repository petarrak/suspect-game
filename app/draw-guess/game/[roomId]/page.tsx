"use client";

import {
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { motion } from "motion/react";

import { useLanguage } from "@/components/LanguageProvider";
import { playSound } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";

import {
  addDrawGuessStroke,
  clearDrawGuessCanvas,
  finishDrawGuessRound,
  getCurrentDrawGuessRound,
  getDrawGuessGameState,
  getDrawGuessStrokes,
  submitDrawGuessGuess,
  useDrawGuessPresence,
  type DrawGuessGameState,
  type DrawGuessStroke,
} from "@/lib/drawGuess";

type Point = {
  x: number;
  y: number;
};

type StrokePayload = {
  type: "stroke" | "clear";
  color?: string;
  width?: number;
  points?: Point[];
};

const COLORS = [
  "#111111",
  "#6b7280",
  "#92400e",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
];

const WIDTHS = [
  3,
  6,
  10,
];

const ERASER_WIDTHS = [
  18,
  32,
  50,
];

export default function DrawGuessGamePage() {
  const params =
    useParams();

  const router =
    useRouter();

  const {
    language,
  } = useLanguage();

  const rawRoomId =
    params.roomId;

  const roomId =
    Array.isArray(
      rawRoomId
    )
      ? rawRoomId[0]
      : rawRoomId;

  useDrawGuessPresence(roomId);

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const canvasCssWidthRef =
    useRef(0);

  const drawingRef =
    useRef(false);

  const pointsRef =
    useRef<Point[]>([]);

  const finishTriggeredRef =
    useRef(false);

  const transitionTimerRef =
    useRef<number | null>(null);

  const lastCorrectGuessRef =
    useRef<string | null>(null);

  const [
    state,
    setState,
  ] =
    useState<
      DrawGuessGameState | null
    >(null);

  const [
    roundId,
    setRoundId,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    guess,
    setGuess,
  ] =
    useState("");

  const [
    sendingGuess,
    setSendingGuess,
  ] =
    useState(false);

  const [
    lastGuessResult,
    setLastGuessResult,
  ] =
    useState<
      string | null
    >(null);

  const [
    color,
    setColor,
  ] =
    useState(
      COLORS[0]
    );

  const [
    brushWidth,
    setBrushWidth,
  ] =
    useState(
      WIDTHS[1]
    );

  const [
    isEraser,
    setIsEraser,
  ] = useState(false);

  const [
    eraserWidth,
    setEraserWidth,
  ] = useState(
    ERASER_WIDTHS[1]
  );

  const [
    undoLoading,
    setUndoLoading,
  ] = useState(false);

  const [
    secondsLeft,
    setSecondsLeft,
  ] =
    useState(0);

  const [
    roundTransition,
    setRoundTransition,
  ] =
    useState<{
      visible: boolean;
      word: string | null;
      nextStatus: "choosing" | "ended";
    }>({
      visible: false,
      word: null,
      nextStatus: "choosing",
    });

  const isDrawer =
    Boolean(
      state?.is_drawer
    );

  const myPlayer =
    useMemo(() => {
      if (
        !state ||
        !state.my_player_id
      ) {
        return null;
      }

      return (
        state.players.find(
          (
            player
          ) =>
            player.id ===
            state.my_player_id
        ) ?? null
      );
    }, [
      state,
    ]);

  const word =
    useMemo(() => {
      if (
        !state?.word
      ) {
        return null;
      }

      return language === "hr"
        ? state.word.word_hr
        : state.word.word_en;
    }, [
      state,
      language,
    ]);

  const drawerName =
    state?.drawer
      ? `${state.drawer.avatar} ${state.drawer.nickname}`
      : "";

  const showRoundTransition =
    useCallback(
      (
        nextStatus: "choosing" | "ended",
        revealWord?: string | null,
        finishCurrentRound = false
      ) => {
        if (
          transitionTimerRef.current !== null
        ) {
          return;
        }

        const shownWord =
          revealWord?.trim() ||
          lastCorrectGuessRef.current ||
          null;

        setRoundTransition({
          visible: true,
          word: shownWord,
          nextStatus,
        });

        playSound(
          "score",
          0.65
        );

        transitionTimerRef.current =
          window.setTimeout(
            async () => {
              let destination =
                nextStatus;

              try {
                if (finishCurrentRound) {
                  const result =
                    await finishDrawGuessRound(
                      roomId
                    );

                  destination =
                    result.status === "ended"
                      ? "ended"
                      : "choosing";
                }

                if (destination === "ended") {
                  router.replace(
                    `/draw-guess/results/${roomId}`
                  );
                } else {
                  router.replace(
                    `/draw-guess/choose/${roomId}`
                  );
                }
              } catch (e: any) {
                transitionTimerRef.current = null;

                setRoundTransition((current) => ({
                  ...current,
                  visible: false,
                }));

                setError(
                  e?.message ??
                    "Could not finish round."
                );
              }
            },
            3000
          );
      },
      [
        roomId,
        router,
      ]
    );

  useEffect(() => {
    if (!state) {
      return;
    }

    const stoppedAfterCorrectGuess =
      state.status === "drawing" &&
      !state.round_ends_at &&
      state.guesses.some(
        (item) => item.is_correct
      );

    if (state.status === "choosing") {
      showRoundTransition(
        "choosing",
        word
      );
    }

    if (
      state.status === "reveal" ||
      stoppedAfterCorrectGuess
    ) {
      showRoundTransition(
        "choosing",
        word,
        Boolean(
          myPlayer?.is_host
        )
      );
    }

    if (state.status === "ended") {
      showRoundTransition(
        "ended",
        word
      );
    }
  }, [
    state?.status,
    state?.round_ends_at,
    state?.guesses,
    myPlayer?.is_host,
    showRoundTransition,
    word,
  ]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;
    let checking = false;

    const interval =
      window.setInterval(
        async () => {
          if (
            checking ||
            roundTransition.visible
          ) {
            return;
          }

          checking = true;

          try {
            const fresh =
              await getDrawGuessGameState(
                roomId
              );

            if (!cancelled) {
              setState(fresh);
            }
          } catch {
          } finally {
            checking = false;
          }
        },
        1000
      );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval
      );
    };
  }, [
    roomId,
    roundTransition.visible,
  ]);

  const drawStroke =
    useCallback(
      (
        payload:
          StrokePayload
      ) => {
        const canvas =
          canvasRef.current;

        if (!canvas) {
          return;
        }

        const ctx =
          canvas.getContext(
            "2d"
          );

        if (!ctx) {
          return;
        }

        const rect =
          canvas.getBoundingClientRect();

        if (
          payload.type ===
          "clear"
        ) {
          ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          ctx.fillStyle =
            "#ffffff";

          ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          return;
        }

        const points =
          payload.points ??
          [];

        if (
          points.length <
          2
        ) {
          return;
        }

        ctx.strokeStyle =
          payload.color ??
          "#111111";

        ctx.lineWidth =
          payload.width ??
          6;

        ctx.lineCap =
          "round";

        ctx.lineJoin =
          "round";

        ctx.beginPath();

        ctx.moveTo(
          points[0].x *
            rect.width,
          points[0].y *
            rect.height
        );

        for (
          let i = 1;
          i < points.length;
          i++
        ) {
          ctx.lineTo(
            points[i].x *
              rect.width,
            points[i].y *
              rect.height
          );
        }

        ctx.stroke();
      },
      []
    );

  const resetCanvas =
    useCallback(() => {
      const canvas =
        canvasRef.current;

      if (!canvas) {
        return;
      }

      const rect =
        canvas.getBoundingClientRect();

      canvasCssWidthRef.current =
        rect.width;

      const ratio =
        window.devicePixelRatio ||
        1;

      canvas.width =
        Math.max(
          1,
          Math.floor(
            rect.width *
              ratio
          )
        );

      canvas.height =
        Math.max(
          1,
          Math.floor(
            rect.height *
              ratio
          )
        );

      const ctx =
        canvas.getContext(
          "2d"
        );

      if (!ctx) {
        return;
      }

      ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
      );

      ctx.fillStyle =
        "#ffffff";

      ctx.fillRect(
        0,
        0,
        rect.width,
        rect.height
      );
    }, []);

  const redrawCanvas =
    useCallback(
      async (
        activeRoundId: string
      ) => {
        resetCanvas();

        const strokes =
          await getDrawGuessStrokes(
            roomId,
            activeRoundId
          );

        resetCanvas();

        for (const stroke of strokes) {
          drawStroke(
            stroke.stroke_data as StrokePayload
          );
        }
      },
      [
        roomId,
        resetCanvas,
        drawStroke,
      ]
    );

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled =
      false;

    async function load() {
      try {
        setLoading(
          true
        );

        setError(
          null
        );

        const [
          freshState,
          freshRound,
        ] =
          await Promise.all([
            getDrawGuessGameState(
              roomId
            ),

            getCurrentDrawGuessRound(
              roomId
            ),
          ]);

        if (
          cancelled
        ) {
          return;
        }

        if (
          freshState.status ===
          "choosing"
        ) {
          router.replace(
            `/draw-guess/choose/${roomId}`
          );

          return;
        }

        if (
          freshState.status ===
          "ended"
        ) {
          router.replace(
            `/draw-guess/results/${roomId}`
          );

          return;
        }

        setState(
          freshState
        );

        const activeRoundId =
          freshState.round_id ??
          freshRound?.id ??
          null;

        setRoundId(
          activeRoundId
        );

        requestAnimationFrame(
          () => {
            resetCanvas();
          }
        );

        if (
          activeRoundId
        ) {
          await redrawCanvas(
            activeRoundId
          );
        }
      } catch (e: any) {
        if (
          !cancelled
        ) {
          setError(
            e?.message ??
              "Could not load game."
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled =
        true;
    };
  }, [
    roomId,
    router,
    drawStroke,
    resetCanvas,
    redrawCanvas,
  ]);

  useEffect(() => {
    function handleResize() {
      const canvas =
        canvasRef.current;

      if (!canvas) {
        return;
      }

      const nextWidth =
        canvas.getBoundingClientRect().width;

      /*
       * Opening/closing a mobile keyboard changes only viewport height.
       * Do not reset the canvas for that change because it briefly erases
       * the drawing. Redraw only when the actual canvas width changes,
       * such as device rotation or a real layout-width change.
       */
      if (
        Math.abs(
          nextWidth -
            canvasCssWidthRef.current
        ) < 1
      ) {
        return;
      }

      if (roundId) {
        void redrawCanvas(
          roundId
        );
      } else {
        resetCanvas();
      }
    }

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, [
    resetCanvas,
    redrawCanvas,
    roundId,
  ]);

  useEffect(() => {
    if (
      !roomId ||
      !roundId
    ) {
      return;
    }

    const strokesChannel =
      supabase
        .channel(
          `draw-guess-strokes-${roundId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "INSERT",

            schema:
              "public",

            table:
              "draw_guess_strokes",

            filter:
              `round_id=eq.${roundId}`,
          },
          (
            payload
          ) => {
            const stroke =
              payload.new as DrawGuessStroke;

            drawStroke(
              stroke.stroke_data as StrokePayload
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event:
              "DELETE",

            schema:
              "public",

            table:
              "draw_guess_strokes",
          },
          () => {
            void redrawCanvas(
              roundId
            );
          }
        )
        .subscribe();

    const guessesChannel =
      supabase
        .channel(
          `draw-guess-guesses-${roundId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "INSERT",

            schema:
              "public",

            table:
              "draw_guess_guesses",

            filter:
              `round_id=eq.${roundId}`,
          },
          async (
            payload
          ) => {
            const inserted =
              payload.new as {
                is_correct?: boolean;
                guess_text?: string;
              };

            if (
              inserted.is_correct &&
              inserted.guess_text
            ) {
              lastCorrectGuessRef.current =
                inserted.guess_text;
            }

            try {
              const fresh =
                await getDrawGuessGameState(
                  roomId
                );

              setState(
                fresh
              );
            } catch {}
          }
        )
        .subscribe();

    const playersChannel =
      supabase
        .channel(
          `draw-guess-game-players-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",

            schema:
              "public",

            table:
              "draw_guess_players",

            filter:
              `room_id=eq.${roomId}`,
          },
          async () => {
            try {
              const fresh =
                await getDrawGuessGameState(
                  roomId
                );

              setState(
                fresh
              );
            } catch {}
          }
        )
        .subscribe();

    const roomChannel =
      supabase
        .channel(
          `draw-guess-game-room-${roomId}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",

            schema:
              "public",

            table:
              "draw_guess_rooms",

            filter:
              `id=eq.${roomId}`,
          },
          (
            payload
          ) => {
            const updated =
              payload.new as {
                status?: string;
              };

            if (
              updated.status ===
              "choosing"
            ) {
              showRoundTransition(
                "choosing",
                word
              );
            }

            if (
              updated.status ===
              "ended"
            ) {
              showRoundTransition(
                "ended",
                word
              );
            }
          }
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        strokesChannel
      );

      void supabase.removeChannel(
        guessesChannel
      );

      void supabase.removeChannel(
        playersChannel
      );

      void supabase.removeChannel(
        roomChannel
      );
    };
  }, [
    roomId,
    roundId,
    router,
    drawStroke,
    resetCanvas,
    redrawCanvas,
    showRoundTransition,
    word,
  ]);

  useEffect(() => {
    return () => {
      if (
        transitionTimerRef.current !== null
      ) {
        window.clearTimeout(
          transitionTimerRef.current
        );
      }
    };
  }, []);

  useEffect(() => {
    if (
      !state?.round_ends_at
    ) {
      return;
    }

    finishTriggeredRef.current =
      false;

    function updateTimer() {
      const target =
        new Date(
          state!.round_ends_at!
        ).getTime();

      const left =
        Math.max(
          0,
          Math.ceil(
            (
              target -
              Date.now()
            ) /
              1000
          )
        );

      setSecondsLeft(
        left
      );

      if (
        left === 0 &&
        myPlayer?.is_host &&
        !finishTriggeredRef.current
      ) {
        finishTriggeredRef.current =
          true;

        void finishDrawGuessRound(
          roomId
        ).catch(
          () => {
            finishTriggeredRef.current =
              false;
          }
        );
      }
    }

    updateTimer();

    const interval =
      window.setInterval(
        updateTimer,
        500
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    state?.round_ends_at,
    myPlayer?.is_host,
    roomId,
  ]);

  function getPoint(
    event:
      PointerEvent<HTMLCanvasElement>
  ): Point {
    const canvas =
      canvasRef.current!;

    const rect =
      canvas.getBoundingClientRect();

    const x =
      (
          event.clientX -
          rect.left
        ) /
        rect.width;

    const y =
      (
          event.clientY -
          rect.top
        ) /
        rect.height;

    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  }

  function handlePointerDown(
    event:
      PointerEvent<HTMLCanvasElement>
  ) {
    if (
      !isDrawer ||
      !roundId
    ) {
      return;
    }

    event.preventDefault();

    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    // Final synchronous guard for the very first mobile touch.
    if (
      Math.abs(canvas.width - Math.floor(rect.width * ratio)) > 1 ||
      Math.abs(canvas.height - Math.floor(rect.height * ratio)) > 1
    ) {
      resetCanvas();
    }

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    drawingRef.current =
      true;

    pointsRef.current = [
      getPoint(
        event
      ),
    ];
  }

  function handlePointerMove(
    event:
      PointerEvent<HTMLCanvasElement>
  ) {
    if (
      !drawingRef.current ||
      !isDrawer
    ) {
      return;
    }

    const point =
      getPoint(
        event
      );

    const previous =
      pointsRef.current[
        pointsRef.current.length -
          1
      ];

    pointsRef.current.push(
      point
    );

    drawStroke({
      type:
        "stroke",

      color:
        isEraser
          ? "#ffffff"
          : color,

      width:
        isEraser
          ? eraserWidth
          : brushWidth,

      points: [
        previous,
        point,
      ],
    });
  }

  async function endStroke() {
    if (
      !drawingRef.current ||
      !isDrawer ||
      !roundId ||
      !state?.my_player_id
    ) {
      drawingRef.current =
        false;

      pointsRef.current =
        [];

      return;
    }

    drawingRef.current =
      false;

    const points =
      pointsRef.current;

    pointsRef.current =
      [];

    if (
      points.length <
      2
    ) {
      return;
    }

    try {
      await addDrawGuessStroke(
        roomId,
        roundId,
        state.my_player_id,
        {
          type:
            "stroke",

          color:
            isEraser
              ? "#ffffff"
              : color,

          width:
            isEraser
              ? eraserWidth
              : brushWidth,

          points,
        }
      );
    } catch (
      e
    ) {
      console.error(
        e
      );
    }
  }

  async function handleClear() {
    if (
      !isDrawer ||
      !roundId
    ) {
      return;
    }

    try {
      playSound(
        "click",
        0.45
      );

      await clearDrawGuessCanvas(
        roomId,
        roundId
      );

      resetCanvas();
    } catch (
      e: any
    ) {
      setError(
        e?.message ??
          "Could not clear canvas."
      );
    }
  }

  async function handleUndo() {
    if (
      !isDrawer ||
      !roundId ||
      undoLoading
    ) {
      return;
    }

    setUndoLoading(true);
    setError(null);

    try {
      playSound(
        "click",
        0.45
      );

      const { error: undoError } =
        await supabase.rpc(
          "undo_draw_guess_stroke",
          {
            p_room_id: roomId,
            p_round_id: roundId,
          }
        );

      if (undoError) {
        throw undoError;
      }

      await redrawCanvas(
        roundId
      );
    } catch (e: any) {
      setError(
        e?.message ??
          "Could not undo stroke."
      );
    } finally {
      setUndoLoading(false);
    }
  }

  async function handleGuess() {
    if (
      isDrawer ||
      sendingGuess ||
      !guess.trim()
    ) {
      return;
    }

    setSendingGuess(
      true
    );

    setLastGuessResult(
      null
    );

    try {
      const result =
        await submitDrawGuessGuess(
          roomId,
          guess
        );

      const correct =
        Boolean(
          result.correct ??
          result.is_correct
        );

      const points =
        Number(
          result.points ??
          result.points_awarded ??
          0
        );

      if (
        correct
      ) {
        lastCorrectGuessRef.current =
          guess.trim();

        playSound(
          "score",
          0.8
        );

        setLastGuessResult(
          language === "hr"
            ? `TOČNO! +${points}`
            : `CORRECT! +${points}`
        );
      } else {
        playSound(
          "click",
          0.3
        );

        setLastGuessResult(
          language === "hr"
            ? "Nije točno."
            : "Not correct."
        );
      }

      setGuess("");

      const fresh =
        await getDrawGuessGameState(
          roomId
        );

      setState(
        fresh
      );
    } catch (
      e: any
    ) {
      setLastGuessResult(
        e?.message ??
          "Could not submit guess."
      );
    } finally {
      setSendingGuess(
        false
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-7xl">
            🎨
          </div>

          <p className="mt-4 text-white/45">
            {language === "hr"
              ? "Učitavanje igre..."
              : "Loading game..."}
          </p>
        </div>
      </main>
    );
  }

  if (
    error &&
    !state
  ) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-accent">
          {error}
        </p>
      </main>
    );
  }

  if (!state) {
    return null;
  }

  const connectedPlayerCount = Math.max(1, state.players.length);
  const visibleTotalRounds = Math.max(
    1,
    Math.ceil(state.total_rounds / connectedPlayerCount)
  );
  const visibleRound = Math.min(
    visibleTotalRounds,
    Math.ceil(state.round_number / connectedPlayerCount)
  );

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-4 p-4">
      {roundTransition.visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
        >
          <motion.div
            className="w-full max-w-sm rounded-[2rem] border border-accent/30 bg-panel2 p-7 text-center shadow-2xl shadow-accent/20"
            initial={{
              opacity: 0,
              scale: 0.82,
              y: 24,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 18,
            }}
          >
            <motion.div
              className="text-7xl"
              initial={{
                scale: 0,
                rotate: -15,
              }}
              animate={{
                scale: 1,
                rotate: 0,
              }}
              transition={{
                delay: 0.1,
                type: "spring",
              }}
            >
              🎉
            </motion.div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-accent">
              {language === "hr"
                ? "RUNDA ZAVRŠENA"
                : "ROUND COMPLETE"}
            </p>

            <h2 className="mt-2 text-3xl font-black">
              {language === "hr"
                ? "Bravo!"
                : "Nice!"}
            </h2>

            {roundTransition.word && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-white/35">
                  {language === "hr"
                    ? "RIJEČ JE BILA"
                    : "THE WORD WAS"}
                </p>

                <p className="mt-2 break-words text-3xl font-black text-accent">
                  {roundTransition.word}
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-white/45">
              <motion.span
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                ⏳
              </motion.span>

              <span>
                {roundTransition.nextStatus ===
                "ended"
                  ? language === "hr"
                    ? "Otvaram konačne rezultate..."
                    : "Opening final results..."
                  : language === "hr"
                  ? "Sljedeći igrač bira riječ..."
                  : "Next player is choosing a word..."}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}

      <motion.header
        className="text-center pt-2"
        initial={{
          opacity:
            0,

          y:
            -12,
        }}
        animate={{
          opacity:
            1,

          y:
            0,
        }}
      >
        <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
          🎨 DRAW & GUESS
        </p>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-white/40">
            {language === "hr"
              ? "RUNDA"
              : "ROUND"}{" "}
            {
              visibleRound
            }
            /
            {
              visibleTotalRounds
            }
          </p>

          <div
            className={`rounded-full px-4 py-2 text-lg font-black ${
              secondsLeft <=
              10
                ? "bg-red-500/15 text-red-300"
                : "bg-white/5 text-white"
            }`}
          >
            ⏱️{" "}
            {
              secondsLeft
            }s
          </div>
        </div>
      </motion.header>

      <section className="rounded-2xl border border-white/10 bg-panel2 p-4 text-center">
        {isDrawer ? (
          <>
            <p className="text-xs font-black uppercase tracking-widest text-white/35">
              {language === "hr"
                ? "TVOJA RIJEČ"
                : "YOUR WORD"}
            </p>

            <p className="mt-1 text-3xl font-black text-accent">
              {
                word ??
                "..."
              }
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-black uppercase tracking-widest text-white/35">
              {language === "hr"
                ? "CRTA"
                : "DRAWING"}
            </p>

            <p className="mt-1 text-xl font-black">
              {
                drawerName
              }
            </p>
          </>
        )}
      </section>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white shadow-xl shadow-black/30">
        <canvas
          ref={
            canvasRef
          }
          className={`block h-[340px] w-full bg-white ${
            isDrawer
              ? "touch-none cursor-crosshair"
              : "cursor-default"
          }`}
          onPointerDown={
            handlePointerDown
          }
          onPointerMove={
            handlePointerMove
          }
          onPointerUp={() =>
            void endStroke()
          }
          onPointerCancel={() =>
            void endStroke()
          }
        />
      </div>

      {isDrawer && (
        <section className="flex flex-col gap-3">
          <div className="grid grid-cols-6 gap-2">
            {COLORS.map(
              (
                item
              ) => (
                <button
                  key={
                    item
                  }
                  type="button"
                  onClick={() =>
                    {
                      setColor(item);
                      setIsEraser(false);
                    }
                  }
                  className={`mx-auto h-9 w-9 rounded-full border-4 ${
                    !isEraser &&
                    color === item
                      ? "border-accent"
                      : "border-white/20"
                  }`}
                  style={{
                    backgroundColor:
                      item,
                  }}
                />
              )
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(isEraser ? ERASER_WIDTHS : WIDTHS).map(
              (
                width
              ) => (
                <button
                  key={
                    width
                  }
                  type="button"
                  onClick={() =>
                    isEraser
                      ? setEraserWidth(width)
                      : setBrushWidth(width)
                  }
                  className={`rounded-xl border py-3 font-black ${
                    (isEraser
                      ? eraserWidth === width
                      : brushWidth === width)
                      ? "border-accent bg-accent/15"
                      : "border-white/10 bg-panel2"
                  }`}
                >
                  {isEraser
                    ? width === 18
                      ? language === "hr" ? "MALA" : "SMALL"
                      : width === 32
                      ? language === "hr" ? "SREDNJA" : "MEDIUM"
                      : language === "hr" ? "VELIKA" : "LARGE"
                    : width === 3
                    ? language === "hr" ? "TANKO" : "THIN"
                    : width === 6
                    ? language === "hr" ? "SREDNJE" : "MEDIUM"
                    : language === "hr" ? "DEBELO" : "THICK"}
                </button>
              )
            )}

          </div>

          <div className="grid grid-cols-3 gap-2">

            <button
              type="button"
              onClick={() =>
                setIsEraser(
                  (current) => !current
                )
              }
              className={`rounded-xl border py-3 font-black ${
                isEraser
                  ? "border-accent bg-accent/15"
                  : "border-white/10 bg-panel2"
              }`}
              title={
                language === "hr"
                  ? "Gumica"
                  : "Eraser"
              }
            >
              🧽 {language === "hr" ? "GUMICA" : "ERASER"}
            </button>

            <button
              type="button"
              disabled={undoLoading}
              onClick={() =>
                void handleUndo()
              }
              className="rounded-xl border border-white/10 bg-panel2 py-3 font-black disabled:opacity-40"
              title="Undo"
            >
              ↩️ UNDO
            </button>

            <button
              type="button"
              onClick={() =>
                void handleClear()
              }
              className="rounded-xl border border-red-500/20 bg-red-500/10 py-3 font-black text-red-300"
            >
              🗑️ {language === "hr" ? "SVE" : "ALL"}
            </button>
          </div>
        </section>
      )}

      {!isDrawer && (
        <section className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={
                guess
              }
              disabled={
                sendingGuess ||
                state.has_guessed
              }
              placeholder={
                state.has_guessed
                  ? language ===
                    "hr"
                    ? "Već si pogodio!"
                    : "Already guessed!"
                  : language ===
                    "hr"
                  ? "Upiši odgovor..."
                  : "Enter your guess..."
              }
              onChange={(
                e
              ) =>
                setGuess(
                  e.target.value
                )
              }
              onKeyDown={(
                e
              ) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  void handleGuess();
                }
              }}
            />

            <button
              type="button"
              disabled={
                sendingGuess ||
                state.has_guessed ||
                !guess.trim()
              }
              onClick={() =>
                void handleGuess()
              }
              className="rounded-2xl bg-accent px-5 font-black disabled:opacity-40"
            >
              ➤
            </button>
          </div>

          {lastGuessResult && (
            <p className="text-center text-sm font-black text-accent">
              {
                lastGuessResult
              }
            </p>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-panel2 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-white/35">
            {language === "hr"
              ? "IGRAČI"
              : "PLAYERS"}
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {state.players.map(
            (
              player
            ) => (
              <div
                key={
                  player.id
                }
                className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2"
              >
                <span className="text-2xl">
                  {
                    player.avatar
                  }
                </span>

                <span className="min-w-0 flex-1 truncate font-bold">
                  {
                    player.nickname
                  }
                </span>

                {player.has_guessed && (
                  <span className="text-green-300">
                    ✅
                  </span>
                )}

                <span className="font-black text-accent">
                  {
                    player.score
                  }
                </span>
              </div>
            )
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-panel2 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-white/35">
          {language === "hr"
            ? "POKUŠAJI"
            : "GUESSES"}
        </p>

        <div className="mt-3 flex max-h-44 flex-col gap-2 overflow-y-auto">
          {state.guesses.length ===
          0 ? (
            <p className="text-sm text-white/30">
              {language === "hr"
                ? "Još nema pokušaja."
                : "No guesses yet."}
            </p>
          ) : (
            state.guesses.map(
              (
                item
              ) => (
                <div
                  key={
                    item.id
                  }
                  className="flex items-center gap-2 text-sm"
                >
                  <span>
                    {
                      item.avatar
                    }
                  </span>

                  <span className="font-bold">
                    {
                      item.nickname
                    }
                  </span>

                  <span className="text-white/45">
                    {item.is_correct
                      ? language ===
                        "hr"
                        ? "je pogodio! ✅"
                        : "guessed it! ✅"
                      : item.guess_text}
                  </span>
                </div>
              )
            )
          )}
        </div>
      </section>

      {error && (
        <p className="text-center text-sm text-accent">
          {
            error
          }
        </p>
      )}
    </main>
  );
}