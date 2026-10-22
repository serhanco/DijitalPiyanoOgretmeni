%% Event dump for scripts/etudes/import.mjs: every note, rest, fingering,
%% slur, tie, articulation, key and tempo of a LilyPond score, one
%% tab-separated line each, with repeats unfolded. Columns:
%% staff voice moment grace bar measurePosition clefGlyph timeSignature type fields...
%% (moments are fractions of a whole note). Written next to the output as <name>.events.

\version "2.24.0"

#(define dpo-port #f)
#(define dpo-taken #f)
#(define dpo-staves '())
#(define dpo-voices '())

#(define (dpo-index alist-sym obj)
   (let* ((alist (if (eq? alist-sym 'staff) dpo-staves dpo-voices))
          (hit (assq obj alist)))
     (if hit (cdr hit)
         (let ((n (length alist)))
           (if (eq? alist-sym 'staff)
               (set! dpo-staves (acons obj n dpo-staves))
               (set! dpo-voices (acons obj n dpo-voices)))
           n))))

#(define (dpo-rat m) (ly:format "~a/~a" (ly:moment-main-numerator m) (ly:moment-main-denominator m)))
#(define (dpo-grace m) (ly:format "~a/~a" (ly:moment-grace-numerator m) (ly:moment-grace-denominator m)))

#(define (dpo-out engraver . values)
   (let* ((ctx (ly:translator-context engraver))
          (staff (ly:context-find ctx 'Staff))
          (now (ly:context-current-moment ctx))
          (pos (ly:context-property ctx 'measurePosition))
          (bar (ly:context-property ctx 'currentBarNumber))
          (clef (ly:context-property ctx 'clefGlyph))
          (tsig (ly:context-property ctx 'timeSignatureFraction)))
     (if (not dpo-port)
         (set! dpo-port (open-file (string-append (ly:parser-output-name) ".events") "w")))
     (display
      (string-join
       (append
        (list (ly:format "~a" (if staff (dpo-index 'staff staff) -1))
              (ly:format "~a" (dpo-index 'voice ctx))
              (dpo-rat now) (dpo-grace now)
              (ly:format "~a" bar)
              (if (ly:moment? pos) (dpo-rat pos) "0/1")
              (ly:format "~a" clef)
              (if (pair? tsig) (ly:format "~a/~a" (car tsig) (cdr tsig)) "-"))
        (map (lambda (x) (ly:format "~a" x)) values))
       "\t")
      dpo-port)
     (newline dpo-port)
     (force-output dpo-port)))

#(define (dpo-arts event)
   (string-join
    (map (lambda (a)
           (let ((cls (ly:event-property a 'class '())))
             (cond
              ((memq 'fingering-event cls) (ly:format "finger:~a" (ly:event-property a 'digit)))
              ((memq 'slur-event cls) (ly:format "slur:~a" (ly:event-property a 'span-direction)))
              ((memq 'phrasing-slur-event cls) (ly:format "pslur:~a" (ly:event-property a 'span-direction)))
              ((memq 'tie-event cls) "tie")
              ((memq 'articulation-event cls) (ly:format "script:~a" (ly:event-property a 'articulation-type)))
              (else (ly:format "~a" (if (pair? cls) (car cls) "?"))))))
         (ly:event-property event 'articulations '()))
    ","))

#(define (dpo-dur d)
   (ly:format "~a\t~a\t~a" (ly:duration-log d) (ly:duration-dot-count d) (dpo-rat (ly:duration-length d))))

#(define dpo-engraver
   (make-engraver
    (listeners
     ((note-event engraver event)
      (let ((p (ly:event-property event 'pitch)))
        (dpo-out engraver "note"
                 (+ 60 (ly:pitch-semitones p))
                 (ly:pitch-octave p) (ly:pitch-notename p) (number->string (ly:pitch-alteration p))
                 (dpo-dur (ly:event-property event 'duration))
                 (dpo-arts event))))
     ((rest-event engraver event)
      (dpo-out engraver "rest" (dpo-dur (ly:event-property event 'duration))))
     ((multi-measure-rest-event engraver event)
      (dpo-out engraver "mrest" (dpo-dur (ly:event-property event 'duration))))
     ((skip-event engraver event)
      (dpo-out engraver "skip" (dpo-dur (ly:event-property event 'duration))))
     ((fingering-event engraver event)
      (dpo-out engraver "finger" (ly:event-property event 'digit)))
     ((slur-event engraver event)
      (dpo-out engraver "slur" (ly:event-property event 'span-direction)))
     ((tie-event engraver event)
      (dpo-out engraver "tie"))
     ((articulation-event engraver event)
      (dpo-out engraver "script" (ly:event-property event 'articulation-type)))
     ((tempo-change-event engraver event)
      (let ((unit (ly:event-property event 'tempo-unit))
            (count (ly:event-property event 'metronome-count)))
        (if (and (ly:duration? unit) (number? count))
            (dpo-out engraver "tempo" (dpo-rat (ly:duration-length unit)) count))))
     ((key-change-event engraver event)
      (let ((t (ly:event-property event 'tonic)))
        (dpo-out engraver "key"
                 (if (ly:pitch? t) (ly:pitch-notename t) "-")
                 (if (ly:pitch? t) (number->string (ly:pitch-alteration t)) "-")
                 (string-join
                  (map (lambda (s) (ly:format "~a:~a" (car s) (number->string (cdr s))))
                       (ly:event-property event 'pitch-alist '()))
                  " ")))))))

\layout {
  \context { \Voice \consists #dpo-engraver }
}

%% Only the first score with a \layout is read (a \midi score repeats the notes);
%% import.mjs has already put \unfoldRepeats in front of every score's music.
#(define dpo-original-handler toplevel-score-handler)
#(define (dpo-layout? score)
   (let ((defs (ly:score-output-defs score)))
     (or (null? defs) (any (lambda (def) (eq? (ly:output-def-lookup def 'output-def-kind) 'layout)) defs))))
#(define (toplevel-score-handler score)
   (if (and (not dpo-taken) (dpo-layout? score))
       (let ((new (ly:make-score (ly:score-music score))))
         (set! dpo-taken #t)
         (ly:score-add-output-def! new $defaultlayout)
         (dpo-original-handler new))))
