package com.example.demo.note;

import com.example.demo.common.ResourceNotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Redis-only CRUD. Every note is a JSON value inside the hash "demo:notes",
 * keyed by the note id. No relational database is involved.
 */
@Service
public class NoteService {

    public static final String NOTES_KEY = "demo:notes";

    private static final Logger log = LoggerFactory.getLogger(NoteService.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public NoteService(StringRedisTemplate redis, ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    public List<Note> findAll() {
        Map<String, String> entries = hash().entries(NOTES_KEY);
        List<Note> notes = new ArrayList<>(entries.size());
        for (String json : entries.values()) {
            Note note = parse(json);
            if (note != null) {
                notes.add(note);
            }
        }
        notes.sort(Comparator.comparing(Note::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return notes;
    }

    public Note findById(String id) {
        String json = hash().get(NOTES_KEY, id);
        Note note = json == null ? null : parse(json);
        if (note == null) {
            throw new ResourceNotFoundException("Note", id);
        }
        return note;
    }

    public Note create(NoteRequest request) {
        Instant now = Instant.now();
        Note note = new Note();
        note.setId(UUID.randomUUID().toString());
        note.setTitle(request.title().trim());
        note.setContent(request.content());
        note.setCreatedAt(now);
        note.setUpdatedAt(now);
        save(note);
        return note;
    }

    public Note update(String id, NoteRequest request) {
        Note note = findById(id);
        note.setTitle(request.title().trim());
        note.setContent(request.content());
        note.setUpdatedAt(Instant.now());
        save(note);
        return note;
    }

    public void delete(String id) {
        Long removed = hash().delete(NOTES_KEY, id);
        if (removed == null || removed == 0) {
            throw new ResourceNotFoundException("Note", id);
        }
    }

    private void save(Note note) {
        try {
            hash().put(NOTES_KEY, note.getId(), objectMapper.writeValueAsString(note));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Could not serialize note " + note.getId(), ex);
        }
    }

    private Note parse(String json) {
        try {
            return objectMapper.readValue(json, Note.class);
        } catch (JsonProcessingException ex) {
            log.warn("Skipping unreadable note payload: {}", ex.getMessage());
            return null;
        }
    }

    private HashOperations<String, String, String> hash() {
        return redis.opsForHash();
    }
}
