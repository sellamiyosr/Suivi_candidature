package com.pfetracker.controller;

import com.pfetracker.service.ai.AiChatService;
import com.pfetracker.service.ai.AiClient.Turn;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiChatController {

    private final AiChatService chatService;

    public AiChatController(AiChatService chatService) {
        this.chatService = chatService;
    }

    /** Corps : { messages: [{ role: "user"|"assistant", content }] } → { reply }. */
    @PostMapping("/chat")
    public Map<String, String> chat(@RequestBody ChatRequest request) {
        return Map.of("reply", chatService.reply(request.messages()));
    }

    public record ChatRequest(List<Turn> messages) {
    }
}
